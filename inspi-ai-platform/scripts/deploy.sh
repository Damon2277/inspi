#!/bin/bash

# 生产环境部署脚本
# 使用方法: ./scripts/deploy.sh [docker|k8s] [environment]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的工具
check_dependencies() {
    log_info "检查部署依赖..."
    
    local missing_tools=()
    
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    if [[ "$DEPLOYMENT_TYPE" == "k8s" ]]; then
        if ! command -v kubectl &> /dev/null; then
            missing_tools+=("kubectl")
        fi
        if ! command -v helm &> /dev/null; then
            missing_tools+=("helm")
        fi
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "缺少必要工具: ${missing_tools[*]}"
        log_error "请安装缺少的工具后重试"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 验证环境变量
validate_environment() {
    log_info "验证环境配置..."
    
    local required_vars=(
        "DB_PASSWORD"
        "MYSQL_ROOT_PASSWORD"
        "MYSQL_REPLICATION_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "GRAFANA_PASSWORD"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "缺少必要的环境变量: ${missing_vars[*]}"
        log_error "请设置环境变量或创建 .env 文件"
        exit 1
    fi
    
    # 验证JWT密钥强度
    if [[ ${#JWT_SECRET} -lt 32 ]]; then
        log_error "JWT_SECRET 长度不足，至少需要32个字符"
        exit 1
    fi
    
    log_success "环境配置验证完成"
}

# 构建Docker镜像
build_image() {
    log_info "构建Docker镜像..."
    
    local image_tag="inspi-ai-platform:${VERSION:-latest}"
    
    # 构建镜像
    docker build -t "$image_tag" .
    
    # 如果指定了registry，推送镜像
    if [[ -n "$DOCKER_REGISTRY" ]]; then
        local registry_image="$DOCKER_REGISTRY/$image_tag"
        docker tag "$image_tag" "$registry_image"
        docker push "$registry_image"
        log_success "镜像已推送到 $registry_image"
    fi
    
    log_success "Docker镜像构建完成: $image_tag"
}

# Docker Compose部署
deploy_docker() {
    log_info "使用Docker Compose部署..."
    
    # 检查docker-compose文件
    if [[ ! -f "docker-compose.prod.yml" ]]; then
        log_error "找不到 docker-compose.prod.yml 文件"
        exit 1
    fi
    
    # 创建必要的目录
    mkdir -p nginx/conf.d nginx/ssl mysql/conf.d mysql/init redis prometheus grafana logstash
    
    # 停止现有服务
    log_info "停止现有服务..."
    docker-compose -f docker-compose.prod.yml down --remove-orphans
    
    # 启动服务
    log_info "启动服务..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    check_docker_services
    
    log_success "Docker Compose部署完成"
}

# Kubernetes部署
deploy_k8s() {
    log_info "使用Kubernetes部署..."
    
    # 检查kubectl连接
    if ! kubectl cluster-info &> /dev/null; then
        log_error "无法连接到Kubernetes集群"
        exit 1
    fi
    
    # 创建命名空间
    log_info "创建命名空间..."
    kubectl apply -f k8s/namespace.yaml
    
    # 创建secrets
    log_info "创建secrets..."
    create_k8s_secrets
    
    # 应用配置
    log_info "应用配置..."
    kubectl apply -f k8s/configmap.yaml
    
    # 部署数据库
    log_info "部署数据库..."
    kubectl apply -f k8s/mysql-deployment.yaml
    
    # 等待数据库就绪
    log_info "等待数据库就绪..."
    kubectl wait --for=condition=ready pod -l app=mysql-primary -n inspi-ai --timeout=300s
    
    # 部署应用
    log_info "部署应用..."
    kubectl apply -f k8s/app-deployment.yaml
    
    # 等待应用就绪
    log_info "等待应用就绪..."
    kubectl wait --for=condition=ready pod -l app=inspi-ai-app -n inspi-ai --timeout=300s
    
    # 检查部署状态
    check_k8s_deployment
    
    log_success "Kubernetes部署完成"
}

# 创建Kubernetes secrets
create_k8s_secrets() {
    # 检查secrets是否已存在
    if kubectl get secret inspi-ai-secrets -n inspi-ai &> /dev/null; then
        log_warning "Secrets已存在，跳过创建"
        return
    fi
    
    # 创建应用secrets
    kubectl create secret generic inspi-ai-secrets \
        --from-literal=DB_PASSWORD="$DB_PASSWORD" \
        --from-literal=MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
        --from-literal=MYSQL_REPLICATION_PASSWORD="$MYSQL_REPLICATION_PASSWORD" \
        --from-literal=REDIS_PASSWORD="$REDIS_PASSWORD" \
        --from-literal=JWT_SECRET="$JWT_SECRET" \
        --from-literal=GRAFANA_PASSWORD="$GRAFANA_PASSWORD" \
        --namespace=inspi-ai
    
    # 创建SSL证书secrets（如果存在）
    if [[ -f "ssl/tls.crt" && -f "ssl/tls.key" ]]; then
        kubectl create secret tls ssl-certificates \
            --cert=ssl/tls.crt \
            --key=ssl/tls.key \
            --namespace=inspi-ai
    fi
}

# 检查Docker服务状态
check_docker_services() {
    log_info "检查服务状态..."
    
    local services=(
        "inspi-ai-app:3000"
        "inspi-ai-nginx:80"
        "inspi-ai-mysql-primary:3306"
        "inspi-ai-redis-cluster:7000"
    )
    
    for service in "${services[@]}"; do
        local container_name="${service%:*}"
        local port="${service#*:}"
        
        if docker ps --format "table {{.Names}}" | grep -q "$container_name"; then
            log_success "✓ $container_name 运行正常"
        else
            log_error "✗ $container_name 未运行"
        fi
    done
    
    # 检查应用健康状态
    log_info "检查应用健康状态..."
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost/api/health &> /dev/null; then
            log_success "应用健康检查通过"
            break
        fi
        
        log_info "等待应用启动... ($attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        log_error "应用健康检查失败"
        exit 1
    fi
}

# 检查Kubernetes部署状态
check_k8s_deployment() {
    log_info "检查部署状态..."
    
    # 检查pods状态
    kubectl get pods -n inspi-ai
    
    # 检查services状态
    kubectl get services -n inspi-ai
    
    # 检查HPA状态
    kubectl get hpa -n inspi-ai
    
    # 检查应用健康状态
    log_info "检查应用健康状态..."
    local app_service=$(kubectl get service inspi-ai-app-service -n inspi-ai -o jsonpath='{.spec.clusterIP}')
    
    if kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- curl -f "http://$app_service:3000/api/health"; then
        log_success "应用健康检查通过"
    else
        log_error "应用健康检查失败"
        exit 1
    fi
}

# 数据库初始化
init_database() {
    log_info "初始化数据库..."
    
    if [[ "$DEPLOYMENT_TYPE" == "docker" ]]; then
        # Docker环境下的数据库初始化
        docker exec inspi-ai-mysql-primary mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "
            CREATE DATABASE IF NOT EXISTS inspi_ai_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            CREATE USER IF NOT EXISTS 'inspi_user'@'%' IDENTIFIED BY '$DB_PASSWORD';
            GRANT ALL PRIVILEGES ON inspi_ai_prod.* TO 'inspi_user'@'%';
            CREATE USER IF NOT EXISTS 'replicator'@'%' IDENTIFIED BY '$MYSQL_REPLICATION_PASSWORD';
            GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
            FLUSH PRIVILEGES;
        "
    elif [[ "$DEPLOYMENT_TYPE" == "k8s" ]]; then
        # Kubernetes环境下的数据库初始化
        kubectl exec -n inspi-ai mysql-primary-0 -- mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "
            CREATE DATABASE IF NOT EXISTS inspi_ai_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            CREATE USER IF NOT EXISTS 'inspi_user'@'%' IDENTIFIED BY '$DB_PASSWORD';
            GRANT ALL PRIVILEGES ON inspi_ai_prod.* TO 'inspi_user'@'%';
            CREATE USER IF NOT EXISTS 'replicator'@'%' IDENTIFIED BY '$MYSQL_REPLICATION_PASSWORD';
            GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
            FLUSH PRIVILEGES;
        "
    fi
    
    log_success "数据库初始化完成"
}

# 运行数据库迁移
run_migrations() {
    log_info "运行数据库迁移..."
    
    if [[ "$DEPLOYMENT_TYPE" == "docker" ]]; then
        docker exec inspi-ai-app npm run migrate
    elif [[ "$DEPLOYMENT_TYPE" == "k8s" ]]; then
        kubectl exec -n inspi-ai deployment/inspi-ai-app -- npm run migrate
    fi
    
    log_success "数据库迁移完成"
}

# 清理资源
cleanup() {
    log_info "清理部署资源..."
    
    if [[ "$DEPLOYMENT_TYPE" == "docker" ]]; then
        docker-compose -f docker-compose.prod.yml down --volumes --remove-orphans
        docker system prune -f
    elif [[ "$DEPLOYMENT_TYPE" == "k8s" ]]; then
        kubectl delete namespace inspi-ai --ignore-not-found=true
    fi
    
    log_success "资源清理完成"
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo
    echo "=== 部署信息 ==="
    echo "部署类型: $DEPLOYMENT_TYPE"
    echo "环境: $ENVIRONMENT"
    echo "版本: ${VERSION:-latest}"
    echo
    
    if [[ "$DEPLOYMENT_TYPE" == "docker" ]]; then
        echo "=== 服务访问地址 ==="
        echo "应用: http://localhost"
        echo "Grafana: http://localhost:3001"
        echo "Prometheus: http://localhost:9090"
        echo "Kibana: http://localhost:5601"
        echo
        echo "=== 管理命令 ==="
        echo "查看日志: docker-compose -f docker-compose.prod.yml logs -f"
        echo "重启服务: docker-compose -f docker-compose.prod.yml restart"
        echo "停止服务: docker-compose -f docker-compose.prod.yml down"
    elif [[ "$DEPLOYMENT_TYPE" == "k8s" ]]; then
        echo "=== Kubernetes信息 ==="
        echo "命名空间: inspi-ai"
        echo
        echo "=== 管理命令 ==="
        echo "查看pods: kubectl get pods -n inspi-ai"
        echo "查看日志: kubectl logs -f deployment/inspi-ai-app -n inspi-ai"
        echo "扩缩容: kubectl scale deployment inspi-ai-app --replicas=5 -n inspi-ai"
    fi
}

# 主函数
main() {
    # 解析参数
    DEPLOYMENT_TYPE=${1:-docker}
    ENVIRONMENT=${2:-production}
    
    # 验证参数
    if [[ "$DEPLOYMENT_TYPE" != "docker" && "$DEPLOYMENT_TYPE" != "k8s" ]]; then
        log_error "无效的部署类型: $DEPLOYMENT_TYPE"
        log_error "支持的类型: docker, k8s"
        exit 1
    fi
    
    # 加载环境变量
    if [[ -f ".env.$ENVIRONMENT" ]]; then
        source ".env.$ENVIRONMENT"
        log_info "加载环境配置: .env.$ENVIRONMENT"
    elif [[ -f ".env" ]]; then
        source ".env"
        log_info "加载环境配置: .env"
    fi
    
    log_info "开始部署 - 类型: $DEPLOYMENT_TYPE, 环境: $ENVIRONMENT"
    
    # 执行部署流程
    check_dependencies
    validate_environment
    build_image
    
    if [[ "$DEPLOYMENT_TYPE" == "docker" ]]; then
        deploy_docker
    elif [[ "$DEPLOYMENT_TYPE" == "k8s" ]]; then
        deploy_k8s
    fi
    
    init_database
    run_migrations
    show_deployment_info
}

# 处理中断信号
trap 'log_error "部署被中断"; exit 1' INT TERM

# 如果直接运行脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi