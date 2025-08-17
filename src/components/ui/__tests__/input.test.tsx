import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';

describe('Input Component', () => {
  it('renders with default props', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('flex', 'h-9', 'w-full');
  });

  it('renders with different input types', () => {
    const { rerender } = render(<Input type="text" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');

    rerender(<Input type="password" />);
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'password');

    rerender(<Input type="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');

    rerender(<Input type="number" />);
    expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number');
  });

  it('handles value and onChange', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'test');

    expect(handleChange).toHaveBeenCalled();
    // userEvent.type triggers onChange for each character
    expect(handleChange).toHaveBeenCalledTimes(4); // 't', 'e', 's', 't'

    // Check that the input element itself has the correct value
    expect(input).toHaveValue('test');
  });

  it('supports controlled input', () => {
    const { rerender } = render(<Input value="initial" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('initial')).toBeInTheDocument();

    rerender(<Input value="updated" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('updated')).toBeInTheDocument();
  });

  it('supports uncontrolled input', async () => {
    const user = userEvent.setup();
    render(<Input defaultValue="default" />);

    const input = screen.getByDisplayValue('default');
    await user.clear(input);
    await user.type(input, 'new value');

    expect(input).toHaveValue('new value');
  });

  it('can be disabled', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');

    expect(input).toBeDisabled();
    expect(input).toHaveClass(
      'disabled:cursor-not-allowed',
      'disabled:opacity-50',
    );
  });

  it('supports placeholder text', () => {
    render(<Input placeholder="Enter text here" />);
    expect(screen.getByPlaceholderText('Enter text here')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<Input className="custom-input" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom-input');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('supports min/max for number inputs', () => {
    render(<Input type="number" min={0} max={100} />);
    const input = screen.getByRole('spinbutton');

    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
  });

  it('supports step for number inputs', () => {
    render(<Input type="number" step={0.1} />);
    expect(screen.getByRole('spinbutton')).toHaveAttribute('step', '0.1');
  });

  it('handles focus and blur events', async () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    const user = userEvent.setup();

    render(<Input onFocus={handleFocus} onBlur={handleBlur} />);

    const input = screen.getByRole('textbox');

    await user.click(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);

    await user.tab();
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard events', async () => {
    const handleKeyDown = vi.fn();
    const user = userEvent.setup();

    render(<Input onKeyDown={handleKeyDown} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Enter}');

    expect(handleKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'Enter',
      }),
    );
  });

  it('has proper accessibility attributes', () => {
    render(
      <Input
        aria-label="Custom input"
        aria-describedby="input-description"
        aria-required={true}
      />,
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-label', 'Custom input');
    expect(input).toHaveAttribute('aria-describedby', 'input-description');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('supports file input type', () => {
    render(<Input type="file" accept=".jpg,.png" />);
    // File inputs don't have the textbox role, use a different query
    const input = screen.getByDisplayValue('');

    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', '.jpg,.png');
  });
});
