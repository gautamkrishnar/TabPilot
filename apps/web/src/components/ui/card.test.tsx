import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';

describe('Card components', () => {
  it('renders Card with children', () => {
    render(<Card>card body</Card>);
    expect(screen.getByText('card body')).toBeInTheDocument();
  });

  it('renders CardTitle as h3 with content', () => {
    render(<CardTitle>My Title</CardTitle>);
    const heading = screen.getByRole('heading', { name: 'My Title' });
    expect(heading.tagName).toBe('H3');
  });

  it('renders CardDescription', () => {
    render(<CardDescription>A description</CardDescription>);
    expect(screen.getByText('A description')).toBeInTheDocument();
  });

  it('renders CardHeader with children', () => {
    render(<CardHeader>header</CardHeader>);
    expect(screen.getByText('header')).toBeInTheDocument();
  });

  it('renders CardContent with children', () => {
    render(<CardContent>content</CardContent>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('renders CardFooter with children', () => {
    render(<CardFooter>footer</CardFooter>);
    expect(screen.getByText('footer')).toBeInTheDocument();
  });

  it('forwards className to Card', () => {
    const { container } = render(<Card className="custom">x</Card>);
    expect(container.firstChild).toHaveClass('custom');
  });
});
