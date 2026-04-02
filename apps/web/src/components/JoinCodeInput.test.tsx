import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { JoinCodeInput } from './JoinCodeInput';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setup(onComplete = vi.fn(), props: Partial<Parameters<typeof JoinCodeInput>[0]> = {}) {
  const user = userEvent.setup();
  const utils = render(<JoinCodeInput onComplete={onComplete} {...props} />);
  const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
  return { user, inputs, onComplete, ...utils };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('JoinCodeInput rendering', () => {
  it('renders exactly 6 input boxes', () => {
    const { inputs } = setup();
    expect(inputs).toHaveLength(6);
  });

  it('renders all inputs with empty values initially', () => {
    const { inputs } = setup();
    // biome-ignore lint/suspicious/useIterableCallbackReturn: assertion inside forEach is intentional in tests
    inputs.forEach((input) => expect(input.value).toBe(''));
  });

  it('renders with an externally supplied initial value (uppercase)', () => {
    setup(vi.fn(), { value: 'abc' });
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs[0].value).toBe('A');
    expect(inputs[1].value).toBe('B');
    expect(inputs[2].value).toBe('C');
    expect(inputs[3].value).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Typing & focus advancement
// ---------------------------------------------------------------------------
describe('JoinCodeInput typing', () => {
  it('auto-advances focus to the next box on character input', async () => {
    const { user, inputs } = setup();
    inputs[0].focus();
    await user.type(inputs[0], 'A');
    expect(document.activeElement).toBe(inputs[1]);
  });

  it('converts lowercase input to uppercase', async () => {
    const { user, inputs } = setup();
    inputs[0].focus();
    await user.type(inputs[0], 'a');
    expect(inputs[0].value).toBe('A');
  });

  it('calls onComplete with the full 6-char code when all boxes are filled', async () => {
    const onComplete = vi.fn();
    const { user, inputs } = setup(onComplete);
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i], String.fromCharCode(65 + i)); // A-F
    }
    expect(onComplete).toHaveBeenCalledWith('ABCDEF');
  });

  it('does not call onComplete until all boxes are filled', async () => {
    const onComplete = vi.fn();
    const { user, inputs } = setup(onComplete);
    await user.type(inputs[0], 'A');
    await user.type(inputs[1], 'B');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('ignores special characters and does not advance focus', async () => {
    const { user, inputs } = setup();
    inputs[0].focus();
    await user.type(inputs[0], '!');
    expect(inputs[0].value).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Backspace behaviour
// ---------------------------------------------------------------------------
describe('JoinCodeInput backspace', () => {
  it('clears the current box when it has a value', async () => {
    const { user, inputs } = setup();
    await user.type(inputs[0], 'A');
    // Move focus explicitly back to first input
    inputs[0].focus();
    await user.keyboard('{Backspace}');
    expect(inputs[0].value).toBe('');
  });

  it('moves focus back to the previous empty box on Backspace in an empty box', async () => {
    const { user, inputs } = setup();
    await user.type(inputs[0], 'A');
    // inputs[1] now has focus; its value is empty so backspace should go to inputs[0]
    await user.keyboard('{Backspace}');
    expect(document.activeElement).toBe(inputs[0]);
  });
});

// ---------------------------------------------------------------------------
// Paste
// ---------------------------------------------------------------------------
describe('JoinCodeInput paste', () => {
  it('spreads pasted text across all boxes', async () => {
    const onComplete = vi.fn();
    const { user, inputs } = setup(onComplete);
    inputs[0].focus();
    await user.paste('XYZABC');
    const allInputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(allInputs[0].value).toBe('X');
    expect(allInputs[1].value).toBe('Y');
    expect(allInputs[2].value).toBe('Z');
    expect(allInputs[3].value).toBe('A');
    expect(allInputs[4].value).toBe('B');
    expect(allInputs[5].value).toBe('C');
    expect(onComplete).toHaveBeenCalledWith('XYZABC');
  });

  it('strips non-alphanumeric characters from pasted text', async () => {
    const onComplete = vi.fn();
    const { user, inputs } = setup(onComplete);
    inputs[0].focus();
    await user.paste('AB-CD EF');
    const allInputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(allInputs[0].value).toBe('A');
    expect(allInputs[1].value).toBe('B');
    expect(allInputs[2].value).toBe('C');
    expect(allInputs[3].value).toBe('D');
    expect(allInputs[4].value).toBe('E');
    expect(allInputs[5].value).toBe('F');
  });

  it('converts pasted lowercase letters to uppercase', async () => {
    const { user, inputs } = setup();
    inputs[0].focus();
    await user.paste('abcdef');
    const allInputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(allInputs[0].value).toBe('A');
    expect(allInputs[5].value).toBe('F');
  });
});

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------
describe('JoinCodeInput disabled', () => {
  it('renders all inputs as disabled', () => {
    setup(vi.fn(), { disabled: true });
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    // biome-ignore lint/suspicious/useIterableCallbackReturn: assertion inside forEach is intentional in tests
    inputs.forEach((input) => expect(input).toBeDisabled());
  });
});
