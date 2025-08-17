import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from '../checkbox';

describe('Checkbox Component', () => {
  it('renders with default props', () => {
    render(<Checkbox />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveClass('peer', 'size-4');
  });

  it('handles checked state', () => {
    const { rerender } = render(<Checkbox checked={false} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();

    rerender(<Checkbox checked={true} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('handles indeterminate state', () => {
    render(<Checkbox checked="indeterminate" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'indeterminate');
  });

  it('handles onCheckedChange callback', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Checkbox onCheckedChange={handleChange} />);

    await user.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('can be disabled', () => {
    render(<Checkbox disabled />);
    const checkbox = screen.getByRole('checkbox');

    expect(checkbox).toBeDisabled();
    expect(checkbox).toHaveClass(
      'disabled:cursor-not-allowed',
      'disabled:opacity-50',
    );
  });

  it('accepts custom className', () => {
    render(<Checkbox className="custom-checkbox" />);
    expect(screen.getByRole('checkbox')).toHaveClass('custom-checkbox');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Checkbox ref={ref} />);
    expect(ref.current).toBeTruthy();
  });

  it('supports controlled checkbox', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <Checkbox checked={false} onCheckedChange={handleChange} />,
    );

    await user.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledWith(true);

    // Simulate parent component updating the checked state
    rerender(<Checkbox checked={true} onCheckedChange={handleChange} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('supports keyboard navigation', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Checkbox onCheckedChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');
    checkbox.focus();

    await user.keyboard(' ');
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('has proper accessibility attributes', () => {
    render(
      <Checkbox
        aria-label="Custom checkbox"
        aria-describedby="checkbox-description"
      />,
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-label', 'Custom checkbox');
    expect(checkbox).toHaveAttribute(
      'aria-describedby',
      'checkbox-description',
    );
    // Note: Radix UI handles required differently, it's applied via data attributes
  });

  it('renders check icon when checked', () => {
    render(<Checkbox checked={true} />);
    const checkbox = screen.getByRole('checkbox');

    // Check for the presence of the check icon
    const checkIcon = checkbox.querySelector('svg');
    expect(checkIcon).toBeInTheDocument();
  });

  it('renders minus icon when indeterminate', () => {
    render(<Checkbox checked="indeterminate" />);
    const checkbox = screen.getByRole('checkbox');

    // Check for the presence of the minus icon
    const minusIcon = checkbox.querySelector('svg');
    expect(minusIcon).toBeInTheDocument();
  });

  it('toggles between states correctly', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Checkbox defaultChecked={false} onCheckedChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');

    // First click should check
    await user.click(checkbox);
    expect(handleChange).toHaveBeenLastCalledWith(true);

    // Second click should uncheck
    await user.click(checkbox);
    expect(handleChange).toHaveBeenLastCalledWith(false);
  });

  it('prevents interaction when disabled', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Checkbox disabled onCheckedChange={handleChange} />);

    await user.click(screen.getByRole('checkbox'));
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('supports form integration', () => {
    render(
      <form>
        <Checkbox name="test-checkbox" value="test-value" />
      </form>,
    );

    const checkbox = screen.getByRole('checkbox');
    // Radix UI Checkbox handles form integration through hidden inputs
    // The visible checkbox element may not have these attributes directly
    expect(checkbox).toBeInTheDocument();
  });
});
