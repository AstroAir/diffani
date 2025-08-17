import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnimationPropertyPanel from '../AnimationPropertyPanel';
import { PropertyType } from '../../../core/timeline/types';

// Mock the store
vi.mock('../../../store', () => ({
  useStore: vi.fn(() => ({
    doc: {
      snapshots: [],
      width: 800,
      height: 600,
      duration: 5000,
    },
    currentTime: 0,
    selectedSnapshots: new Set(),
    animationProperties: [],
    updateAnimationProperty: vi.fn(),
    createAnimationProperty: vi.fn(),
    deleteAnimationProperty: vi.fn(),
  })),
}));

// Mock the easing function
vi.mock('../../../core/transition/easing', () => ({
  getEasingFunction: vi.fn(() => (t: number) => t),
}));

describe('AnimationPropertyPanel', () => {
  const mockProperty = {
    id: 'test-property',
    name: 'Test Property',
    type: PropertyType.NUMBER,
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 50,
    keyframes: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<AnimationPropertyPanel />);
    expect(screen.getByText('Animation Properties')).toBeInTheDocument();
  });

  it('renders property controls for different types', () => {
    const onPropertyUpdate = vi.fn();
    
    render(
      <AnimationPropertyPanel 
        selectedProperty={mockProperty}
        onPropertyUpdate={onPropertyUpdate}
      />
    );
    
    // Should render number input and slider for NUMBER type
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('handles number property changes', async () => {
    const onPropertyUpdate = vi.fn();
    const user = userEvent.setup();
    
    render(
      <AnimationPropertyPanel 
        selectedProperty={mockProperty}
        onPropertyUpdate={onPropertyUpdate}
      />
    );
    
    const numberInput = screen.getByRole('spinbutton');
    await user.clear(numberInput);
    await user.type(numberInput, '75');
    
    expect(onPropertyUpdate).toHaveBeenCalled();
  });

  it('renders color property controls', () => {
    const colorProperty = {
      ...mockProperty,
      type: PropertyType.COLOR,
      defaultValue: '#ff0000',
    };
    
    render(
      <AnimationPropertyPanel 
        selectedProperty={colorProperty}
      />
    );
    
    // Should render color picker and text input
    expect(screen.getByDisplayValue('#ff0000')).toBeInTheDocument();
  });

  it('renders boolean property controls', async () => {
    const booleanProperty = {
      ...mockProperty,
      type: PropertyType.BOOLEAN,
      defaultValue: false,
    };
    
    const onPropertyUpdate = vi.fn();
    const user = userEvent.setup();
    
    render(
      <AnimationPropertyPanel 
        selectedProperty={booleanProperty}
        onPropertyUpdate={onPropertyUpdate}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    
    await user.click(checkbox);
    expect(onPropertyUpdate).toHaveBeenCalled();
  });

  it('renders position property controls', () => {
    const positionProperty = {
      ...mockProperty,
      type: PropertyType.POSITION,
      defaultValue: { x: 100, y: 200 },
    };
    
    render(
      <AnimationPropertyPanel 
        selectedProperty={positionProperty}
      />
    );
    
    // Should render X and Y inputs
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue(100);
    expect(inputs[1]).toHaveValue(200);
  });

  it('renders scale property controls', () => {
    const scaleProperty = {
      ...mockProperty,
      type: PropertyType.SCALE,
      defaultValue: { x: 1.5, y: 2.0 },
    };
    
    render(
      <AnimationPropertyPanel 
        selectedProperty={scaleProperty}
      />
    );
    
    // Should render X and Y inputs for scale
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue(1.5);
    expect(inputs[1]).toHaveValue(2.0);
  });

  it('renders rotation property controls', () => {
    const rotationProperty = {
      ...mockProperty,
      type: PropertyType.ROTATION,
      defaultValue: 45,
      min: -360,
      max: 360,
    };
    
    render(
      <AnimationPropertyPanel 
        selectedProperty={rotationProperty}
      />
    );
    
    // Should render slider and number input for rotation
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('renders opacity property controls', () => {
    const opacityProperty = {
      ...mockProperty,
      type: PropertyType.OPACITY,
      defaultValue: 0.8,
      min: 0,
      max: 1,
      step: 0.01,
    };
    
    render(
      <AnimationPropertyPanel 
        selectedProperty={opacityProperty}
      />
    );
    
    // Should render slider and number input for opacity
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('renders text property controls', async () => {
    const textProperty = {
      ...mockProperty,
      type: PropertyType.TEXT,
      defaultValue: 'Hello World',
    };
    
    const onPropertyUpdate = vi.fn();
    const user = userEvent.setup();
    
    render(
      <AnimationPropertyPanel 
        selectedProperty={textProperty}
        onPropertyUpdate={onPropertyUpdate}
      />
    );
    
    const textInput = screen.getByDisplayValue('Hello World');
    expect(textInput).toBeInTheDocument();
    
    await user.clear(textInput);
    await user.type(textInput, 'Updated Text');
    
    expect(onPropertyUpdate).toHaveBeenCalled();
  });

  it('handles property creation', async () => {
    const onPropertyCreate = vi.fn();
    const user = userEvent.setup();
    
    render(
      <AnimationPropertyPanel 
        onPropertyCreate={onPropertyCreate}
      />
    );
    
    // Click create property button
    const createButton = screen.getByText('Create Property');
    await user.click(createButton);
    
    // Should show property creation form
    expect(screen.getByPlaceholderText('Enter property name...')).toBeInTheDocument();
  });

  it('handles property deletion', async () => {
    const onPropertyDelete = vi.fn();
    const user = userEvent.setup();
    
    render(
      <AnimationPropertyPanel 
        selectedProperty={mockProperty}
        onPropertyDelete={onPropertyDelete}
      />
    );
    
    // Find and click delete button
    const deleteButton = screen.getByText('Delete Property');
    await user.click(deleteButton);
    
    expect(onPropertyDelete).toHaveBeenCalledWith(mockProperty.id);
  });

  it('validates property values within bounds', async () => {
    const onPropertyUpdate = vi.fn();
    const user = userEvent.setup();
    
    render(
      <AnimationPropertyPanel 
        selectedProperty={mockProperty}
        onPropertyUpdate={onPropertyUpdate}
      />
    );
    
    const numberInput = screen.getByRole('spinbutton');
    
    // Try to enter value above max
    await user.clear(numberInput);
    await user.type(numberInput, '150');
    
    // Value should be clamped to max (100)
    expect(numberInput).toHaveValue(100);
  });

  it('shows property presets', () => {
    render(<AnimationPropertyPanel />);
    
    // Should show preset options
    expect(screen.getByText('Property Presets')).toBeInTheDocument();
  });

  it('applies property presets', async () => {
    const onPropertyCreate = vi.fn();
    const user = userEvent.setup();
    
    render(
      <AnimationPropertyPanel 
        onPropertyCreate={onPropertyCreate}
      />
    );
    
    // Find and click a preset
    const fadePreset = screen.getByText('Fade In/Out');
    await user.click(fadePreset);
    
    expect(onPropertyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: PropertyType.OPACITY,
      })
    );
  });
});
