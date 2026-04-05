import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Label</Badge>);
    expect(screen.getByText('Label')).toBeInTheDocument();
  });

  it('applies default variant classes', () => {
    const { container } = render(<Badge>x</Badge>);
    expect(container.firstChild).toHaveClass('rounded-full');
  });

  it('applies destructive variant classes', () => {
    const { container } = render(<Badge variant="destructive">x</Badge>);
    expect(container.firstChild).toHaveClass('bg-red-500/20');
  });

  it('applies success variant classes', () => {
    const { container } = render(<Badge variant="success">x</Badge>);
    expect(container.firstChild).toHaveClass('bg-green-500/20');
  });

  it('forwards className prop', () => {
    const { container } = render(<Badge className="my-class">x</Badge>);
    expect(container.firstChild).toHaveClass('my-class');
  });
});
