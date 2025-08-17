import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from '../dialog';

describe('Dialog Component', () => {
  it('renders dialog trigger', () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
      </Dialog>,
    );

    expect(
      screen.getByRole('button', { name: /open dialog/i }),
    ).toBeInTheDocument();
  });

  it('opens dialog when trigger is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: /open dialog/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
  });

  it('closes dialog when close button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <DialogClose>Close</DialogClose>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: /open dialog/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // There are multiple close buttons, get the first one (our custom close button)
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    await user.click(closeButtons[0]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes dialog when escape key is pressed', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: /open dialog/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('supports controlled open state', async () => {
    const handleOpenChange = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <Dialog open={false} onOpenChange={handleOpenChange}>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /open dialog/i }));
    expect(handleOpenChange).toHaveBeenCalledWith(true);

    // Simulate parent component updating the open state
    rerender(
      <Dialog open={true} onOpenChange={handleOpenChange}>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders dialog with description', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>
              This is a test dialog description
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: /open dialog/i }));

    expect(
      screen.getByText('This is a test dialog description'),
    ).toBeInTheDocument();
  });

  it('traps focus within dialog', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <input placeholder="First input" />
          <input placeholder="Second input" />
          <DialogClose>Close</DialogClose>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: /open dialog/i }));

    const firstInput = screen.getByPlaceholderText('First input');
    const secondInput = screen.getByPlaceholderText('Second input');
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    const closeButton = closeButtons[0]; // Get the first close button

    // Focus should be trapped within the dialog
    // Radix UI manages focus trapping, let's verify focus stays within dialog
    const dialog = screen.getByRole('dialog');

    await user.tab();
    const focusedElement1 = document.activeElement;
    expect(dialog).toContainElement(focusedElement1);

    await user.tab();
    const focusedElement2 = document.activeElement;
    expect(dialog).toContainElement(focusedElement2);

    await user.tab();
    const focusedElement3 = document.activeElement;
    expect(dialog).toContainElement(focusedElement3);
  });

  it('has proper accessibility attributes', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accessible Dialog</DialogTitle>
            <DialogDescription>
              Dialog description for screen readers
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: /open dialog/i }));

    const dialog = screen.getByRole('dialog');
    // Radix UI Dialog handles accessibility attributes automatically
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
  });

  it('prevents background scroll when open', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: /open dialog/i }));

    // Radix UI may handle body scroll prevention differently
    // Check that the body has some scroll prevention applied
    expect(document.body).toHaveAttribute('data-scroll-locked');
  });

  it('accepts custom className for content', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent className="custom-dialog">
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: /open dialog/i }));

    expect(screen.getByRole('dialog')).toHaveClass('custom-dialog');
  });
});
