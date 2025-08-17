import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KeyboardShortcutsHelp, {
  useKeyboardShortcutsHelp,
} from '../KeyboardShortcutsHelp';

// Mock the keyboard utilities
vi.mock('../../../utils/keyboard', () => ({
  KeyboardShortcutManager: {
    getInstance: vi.fn(() => ({
      getShortcutGroups: vi.fn(() => [
        {
          category: 'General',
          shortcuts: [
            {
              id: 'save',
              key: 'Ctrl+S',
              description: 'Save project',
              category: 'General',
            },
            {
              id: 'open',
              key: 'Ctrl+O',
              description: 'Open project',
              category: 'General',
            },
          ],
        },
        {
          category: 'Editing',
          shortcuts: [
            {
              id: 'undo',
              key: 'Ctrl+Z',
              description: 'Undo',
              category: 'Editing',
            },
            {
              id: 'redo',
              key: 'Ctrl+Y',
              description: 'Redo',
              category: 'Editing',
            },
          ],
        },
      ]),
      formatShortcut: vi.fn((shortcut) => shortcut.key),
    })),
  },
  useKeyboardShortcut: vi.fn(),
}));

describe('KeyboardShortcutsHelp', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(<KeyboardShortcutsHelp {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<KeyboardShortcutsHelp {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays shortcut groups and shortcuts', () => {
    render(<KeyboardShortcutsHelp {...defaultProps} />);

    // Check for category headers
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Editing')).toBeInTheDocument();

    // Check for shortcuts
    expect(screen.getByText('Save project')).toBeInTheDocument();
    expect(screen.getByText('Open project')).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Redo')).toBeInTheDocument();

    // Check for key combinations
    expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+O')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+Z')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+Y')).toBeInTheDocument();
  });

  it('handles close button click', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<KeyboardShortcutsHelp {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles escape key press', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<KeyboardShortcutsHelp {...defaultProps} onClose={onClose} />);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports search functionality', async () => {
    const user = userEvent.setup();

    render(<KeyboardShortcutsHelp {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search shortcuts...');
    await user.type(searchInput, 'save');

    // Should show only matching shortcuts
    expect(screen.getByText('Save project')).toBeInTheDocument();
    expect(screen.queryByText('Undo')).not.toBeInTheDocument();
  });

  it('supports category filtering', async () => {
    const user = userEvent.setup();

    render(<KeyboardShortcutsHelp {...defaultProps} />);

    const categorySelect = screen.getByRole('combobox');
    await user.selectOptions(categorySelect, 'Editing');

    // Should show only shortcuts from selected category
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Redo')).toBeInTheDocument();
    expect(screen.queryByText('Save project')).not.toBeInTheDocument();
  });

  it('clears search when clear button is clicked', async () => {
    const user = userEvent.setup();

    render(<KeyboardShortcutsHelp {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search shortcuts...');
    await user.type(searchInput, 'save');

    const clearButton = screen.getByRole('button', { name: /clear search/i });
    await user.click(clearButton);

    expect(searchInput).toHaveValue('');
    // All shortcuts should be visible again
    expect(screen.getByText('Save project')).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  it('shows shortcut count', () => {
    render(<KeyboardShortcutsHelp {...defaultProps} />);

    expect(screen.getByText('4 shortcuts')).toBeInTheDocument();
  });

  it('shows filtered shortcut count', async () => {
    const user = userEvent.setup();

    render(<KeyboardShortcutsHelp {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search shortcuts...');
    await user.type(searchInput, 'ctrl');

    expect(screen.getByText(/shortcuts matching "ctrl"/)).toBeInTheDocument();
  });

  it('displays help hint', () => {
    render(<KeyboardShortcutsHelp {...defaultProps} />);

    expect(screen.getByText('Press Escape to close')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<KeyboardShortcutsHelp {...defaultProps} className="custom-help" />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('custom-help');
  });

  it('prevents body scroll when open', () => {
    render(<KeyboardShortcutsHelp {...defaultProps} />);

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when closed', () => {
    const { rerender } = render(<KeyboardShortcutsHelp {...defaultProps} />);

    rerender(<KeyboardShortcutsHelp {...defaultProps} isOpen={false} />);

    expect(document.body.style.overflow).toBe('');
  });
});

describe('useKeyboardShortcutsHelp hook', () => {
  it('provides help visibility state and controls', () => {
    const TestComponent = () => {
      const { isOpen, show, hide, toggle, KeyboardShortcutsHelp } =
        useKeyboardShortcutsHelp();

      return (
        <div>
          <span data-testid="is-open">{isOpen.toString()}</span>
          <button onClick={show}>Show</button>
          <button onClick={hide}>Hide</button>
          <button onClick={toggle}>Toggle</button>
          <KeyboardShortcutsHelp />
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
    expect(screen.getByText('Show')).toBeInTheDocument();
    expect(screen.getByText('Hide')).toBeInTheDocument();
    expect(screen.getByText('Toggle')).toBeInTheDocument();
  });

  it('handles show/hide/toggle actions', async () => {
    const user = userEvent.setup();

    const TestComponent = () => {
      const { isOpen, show, hide, toggle } = useKeyboardShortcutsHelp();

      return (
        <div>
          <span data-testid="is-open">{isOpen.toString()}</span>
          <button onClick={show}>Show</button>
          <button onClick={hide}>Hide</button>
          <button onClick={toggle}>Toggle</button>
        </div>
      );
    };

    render(<TestComponent />);

    // Initially closed
    expect(screen.getByTestId('is-open')).toHaveTextContent('false');

    // Show
    await user.click(screen.getByText('Show'));
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');

    // Hide
    await user.click(screen.getByText('Hide'));
    expect(screen.getByTestId('is-open')).toHaveTextContent('false');

    // Toggle
    await user.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');

    await user.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
  });
});
