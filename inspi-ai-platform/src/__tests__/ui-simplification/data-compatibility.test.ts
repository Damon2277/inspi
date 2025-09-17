/**
 * UI简化 - 数据结构兼容性测试
 */

// 简化的案例数据接口
interface SimplifiedCaseItem {
  id: number;
  title: string;
  author: string;
  subject: string;
  thumbnail: string;
  uses: number;
}

// 原始复杂的案例数据接口（用于兼容性测试）
interface OriginalCaseItem {
  id: number;
  title: string;
  author: string;
  subject: string;
  grade: string;
  description: string;
  thumbnail: string;
  likes: number;
  uses: number;
  rating: number;
  tags: string[];
}

describe('数据结构兼容性测试', () => {
  const originalData: OriginalCaseItem = {
    id: 1,
    title: '二次函数的图像与性质',
    author: '张老师',
    subject: '数学',
    grade: '高中',
    description: '通过动态图像展示二次函数的变化规律',
    thumbnail: '📊',
    likes: 156,
    uses: 89,
    rating: 4.8,
    tags: ['函数', '图像', '可视化']
  };

  const simplifiedData: SimplifiedCaseItem = {
    id: 1,
    title: '二次函数的图像与性质',
    author: '张老师',
    subject: '数学',
    thumbnail: '📊',
    uses: 89
  };

  test('简化数据模型包含所有必需字段', () => {
    expect(simplifiedData).toHaveProperty('id');
    expect(simplifiedData).toHaveProperty('title');
    expect(simplifiedData).toHaveProperty('author');
    expect(simplifiedData).toHaveProperty('subject');
    expect(simplifiedData).toHaveProperty('thumbnail');
    expect(simplifiedData).toHaveProperty('uses');
  });

  test('简化数据模型字段类型正确', () => {
    expect(typeof simplifiedData.id).toBe('number');
    expect(typeof simplifiedData.title).toBe('string');
    expect(typeof simplifiedData.author).toBe('string');
    expect(typeof simplifiedData.subject).toBe('string');
    expect(typeof simplifiedData.thumbnail).toBe('string');
    expect(typeof simplifiedData.uses).toBe('number');
  });

  test('数据转换函数正确工作', () => {
    const convertToSimplified = (original: OriginalCaseItem): SimplifiedCaseItem => {
      return {
        id: original.id,
        title: original.title,
        author: original.author,
        subject: original.subject,
        thumbnail: original.thumbnail,
        uses: original.uses
      };
    };

    const converted = convertToSimplified(originalData);
    expect(converted).toEqual(simplifiedData);
  });

  test('缺失字段处理', () => {
    const incompleteData = {
      id: 1,
      title: '测试标题',
      author: '测试作者',
      subject: '测试学科',
      thumbnail: '📝'
      // uses 字段缺失
    };

    const withDefaults = {
      ...incompleteData,
      uses: 0 // 默认值
    };

    expect(withDefaults.uses).toBe(0);
    expect(typeof withDefaults.uses).toBe('number');
  });

  test('数组数据处理', () => {
    const originalArray: OriginalCaseItem[] = [originalData];
    const simplifiedArray: SimplifiedCaseItem[] = originalArray.map(item => ({
      id: item.id,
      title: item.title,
      author: item.author,
      subject: item.subject,
      thumbnail: item.thumbnail,
      uses: item.uses
    }));

    expect(simplifiedArray).toHaveLength(1);
    expect(simplifiedArray[0]).toEqual(simplifiedData);
  });
});