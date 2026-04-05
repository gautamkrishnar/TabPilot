import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormDescription, FormItem, FormLabel, FormMessage } from './form';

describe('FormItem', () => {
  it('renders children', () => {
    render(<FormItem>content</FormItem>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});

describe('FormLabel', () => {
  it('renders label text', () => {
    render(<FormLabel htmlFor="test-input">My Label</FormLabel>);
    expect(screen.getByText('My Label')).toBeInTheDocument();
  });

  it('sets htmlFor attribute', () => {
    render(<FormLabel htmlFor="my-field">Label</FormLabel>);
    expect(screen.getByText('Label').closest('label')).toHaveAttribute('for', 'my-field');
  });

  it('forwards extra className', () => {
    render(<FormLabel htmlFor="x" className="custom-class">L</FormLabel>);
    expect(screen.getByText('L').closest('label')?.className).toContain('custom-class');
  });
});

describe('FormMessage', () => {
  it('renders error message when provided', () => {
    render(<FormMessage message="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('renders non-breaking space when no message', () => {
    const { container } = render(<FormMessage />);
    expect(container.querySelector('p')).toBeInTheDocument();
  });

  it('applies opacity-0 class when no message', () => {
    const { container } = render(<FormMessage />);
    expect(container.querySelector('p')?.className).toContain('opacity-0');
  });

  it('does not apply opacity-0 when message is provided', () => {
    const { container } = render(<FormMessage message="Error" />);
    expect(container.querySelector('p')?.className).not.toContain('opacity-0');
  });
});

describe('FormDescription', () => {
  it('renders description text', () => {
    render(<FormDescription>Helper text</FormDescription>);
    expect(screen.getByText('Helper text')).toBeInTheDocument();
  });
});
