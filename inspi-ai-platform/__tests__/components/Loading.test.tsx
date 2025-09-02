import { render, screen } from '@testing-library/react'
import Loading from '@/components/common/Loading'

describe('Loading Component', () => {
  it('renders loading spinner', () => {
    render(<Loading />)
    
    const spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toBeInTheDocument()
  })

  it('renders with custom text', () => {
    const customText = '正在加载...'
    render(<Loading text={customText} />)
    
    expect(screen.getByText(customText)).toBeInTheDocument()
  })

  it('applies correct size classes', () => {
    const { rerender } = render(<Loading size="sm" />)
    expect(document.querySelector('.w-4.h-4')).toBeInTheDocument()

    rerender(<Loading size="lg" />)
    expect(document.querySelector('.w-12.h-12')).toBeInTheDocument()
  })
})