import { render, screen } from '@testing-library/react'
import Footer from '@/components/common/Footer'

describe('Footer Component', () => {
  it('renders the brand name and tagline', () => {
    render(<Footer />)
    
    expect(screen.getByText('Inspi.AI')).toBeInTheDocument()
    expect(screen.getByText('老师的好搭子，更是您教学创意的放大器。')).toBeInTheDocument()
  })

  it('renders quick links', () => {
    render(<Footer />)
    
    expect(screen.getByText('快速链接')).toBeInTheDocument()
    expect(screen.getByText('AI教学魔法师')).toBeInTheDocument()
    expect(screen.getByText('智慧广场')).toBeInTheDocument()
  })

  it('renders support links', () => {
    render(<Footer />)
    
    expect(screen.getByText('支持')).toBeInTheDocument()
    expect(screen.getByText('帮助中心')).toBeInTheDocument()
    expect(screen.getByText('联系我们')).toBeInTheDocument()
  })

  it('renders contact email', () => {
    render(<Footer />)
    
    expect(screen.getByText('联系邮箱: sundp1980@gmail.com')).toBeInTheDocument()
  })
})