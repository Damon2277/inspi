import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email/service';
import Contact from '@/lib/models/Contact';
import { connectDB } from '@/lib/db/connection';
import { ContactFormData } from '@/lib/email/config';

/**
 * 处理联系表单提交
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const {
      name,
      email,
      subject,
      message,
      type = 'general',
      priority = 'normal'
    } = body;

    // 获取客户端信息
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 构建联系表单数据
    const contactData: ContactFormData = {
      name,
      email,
      subject,
      message,
      type,
      priority,
      ipAddress,
      userAgent
    };

    // 发送邮件
    const emailResult = await emailService.sendContactEmail(contactData, ipAddress);
    
    if (!emailResult.success) {
      return NextResponse.json({
        success: false,
        message: emailResult.message,
        errors: emailResult.errors
      }, { status: 400 });
    }

    // 保存到数据库
    try {
      const contact = new Contact({
        name,
        email,
        subject,
        message,
        type,
        priority,
        ipAddress,
        userAgent,
        status: 'new'
      });

      await contact.save();
      
      return NextResponse.json({
        success: true,
        message: emailResult.message,
        contactId: contact._id
      });
      
    } catch (dbError) {
      console.error('保存联系记录到数据库失败:', dbError);
      
      // 即使数据库保存失败，邮件已发送成功，仍返回成功
      return NextResponse.json({
        success: true,
        message: emailResult.message,
        warning: '邮件已发送，但记录保存可能有问题'
      });
    }

  } catch (error) {
    console.error('处理联系表单时出错:', error);
    
    return NextResponse.json({
      success: false,
      message: '系统错误，请稍后重试'
    }, { status: 500 });
  }
}

/**
 * 获取联系统计信息（管理员用）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    await connectDB();
    
    if (action === 'stats') {
      // 获取基本统计
      const stats = await Contact.getStats();
      const typeStats = await Contact.getStatsByType();
      const emailStats = emailService.getEmailStats();
      
      return NextResponse.json({
        success: true,
        data: {
          contact: stats,
          byType: typeStats,
          email: emailStats
        }
      });
      
    } else if (action === 'recent') {
      // 获取最近的联系记录
      const limit = parseInt(searchParams.get('limit') || '10');
      const recent = await Contact.getRecent(limit);
      
      return NextResponse.json({
        success: true,
        data: recent
      });
      
    } else {
      return NextResponse.json({
        success: false,
        message: '无效的操作'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('获取联系统计时出错:', error);
    
    return NextResponse.json({
      success: false,
      message: '获取数据失败'
    }, { status: 500 });
  }
}

/**
 * 更新联系记录状态（管理员用）
 */
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { contactId, status, adminNotes } = body;
    
    if (!contactId || !status) {
      return NextResponse.json({
        success: false,
        message: '缺少必要参数'
      }, { status: 400 });
    }
    
    const contact = await Contact.findByIdAndUpdate(
      contactId,
      {
        status,
        ...(adminNotes && { adminNotes }),
        ...(status === 'resolved' || status === 'closed' ? { resolvedAt: new Date() } : {})
      },
      { new: true }
    );
    
    if (!contact) {
      return NextResponse.json({
        success: false,
        message: '联系记录不存在'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: '状态更新成功',
      data: contact
    });
    
  } catch (error) {
    console.error('更新联系记录状态时出错:', error);
    
    return NextResponse.json({
      success: false,
      message: '更新失败'
    }, { status: 500 });
  }
}