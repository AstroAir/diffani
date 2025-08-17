import { useState, useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Slider } from '../ui/slider';
import {
  type AnimationProperty,
  PropertyType,
  ANIMATION_PROPERTY_PRESETS,
} from '../../core/timeline/types';
import { getEasingFunction } from '../../core/transition/easing';
import styles from './AnimationPropertyPanel.module.scss';

export interface AnimationPropertyPanelProps {
  selectedProperty?: AnimationProperty;
  onPropertyUpdate?: (property: AnimationProperty) => void;
  onPropertyCreate?: (property: AnimationProperty) => void;
  onPropertyDelete?: (propertyId: string) => void;
}

interface PropertyControlProps {
  property: AnimationProperty;
  value: unknown;
  onChange: (value: unknown) => void;
}

function PropertyControl({ property, value, onChange }: PropertyControlProps) {
  const handleChange = useCallback(
    (newValue: unknown) => {
      onChange(newValue);
    },
    [onChange],
  );

  switch (property.type) {
    case PropertyType.NUMBER:
      return (
        <div className={styles.numberControl}>
          <Slider
            min={property.min || 0}
            max={property.max || 100}
            step={property.step || 1}
            value={[value as number]}
            onValueChange={(values) => handleChange(values[0])}
            className={styles.slider}
          />
          <Input
            type="number"
            min={property.min}
            max={property.max}
            step={property.step}
            value={value as number}
            onChange={(e) => handleChange(Number(e.target.value))}
            className={styles.numberInput}
          />
        </div>
      );

    case PropertyType.COLOR:
      return (
        <div className={styles.colorControl}>
          <input
            type="color"
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
            className={styles.colorPicker}
          />
          <Input
            type="text"
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
            className={styles.colorInput}
            placeholder="#000000"
          />
        </div>
      );

    case PropertyType.POSITION:
      const position = value as { x: number; y: number };
      return (
        <div className={styles.positionControl}>
          <div className={styles.positionAxis}>
            <label>X:</label>
            <Input
              type="number"
              value={position.x}
              onChange={(e) =>
                handleChange({ ...position, x: Number(e.target.value) })
              }
              className={styles.positionInput}
            />
          </div>
          <div className={styles.positionAxis}>
            <label>Y:</label>
            <Input
              type="number"
              value={position.y}
              onChange={(e) =>
                handleChange({ ...position, y: Number(e.target.value) })
              }
              className={styles.positionInput}
            />
          </div>
        </div>
      );

    case PropertyType.SCALE:
      const scale = value as { x: number; y: number };
      return (
        <div className={styles.scaleControl}>
          <div className={styles.scaleAxis}>
            <label>X:</label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={scale.x}
              onChange={(e) =>
                handleChange({ ...scale, x: Number(e.target.value) })
              }
              className={styles.scaleInput}
            />
          </div>
          <div className={styles.scaleAxis}>
            <label>Y:</label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={scale.y}
              onChange={(e) =>
                handleChange({ ...scale, y: Number(e.target.value) })
              }
              className={styles.scaleInput}
            />
          </div>
        </div>
      );

    case PropertyType.ROTATION:
      return (
        <div className={styles.rotationControl}>
          <Slider
            min={property.min || -360}
            max={property.max || 360}
            step={property.step || 1}
            value={[value as number]}
            onValueChange={(values) => handleChange(values[0])}
            className={styles.rotationSlider}
          />
          <Input
            type="number"
            min={property.min}
            max={property.max}
            step={property.step}
            value={value as number}
            onChange={(e) => handleChange(Number(e.target.value))}
            className={styles.rotationInput}
          />
          <span className={styles.rotationUnit}>°</span>
        </div>
      );

    case PropertyType.OPACITY:
      return (
        <div className={styles.opacityControl}>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[value as number]}
            onValueChange={(values) => handleChange(values[0])}
            className={styles.opacitySlider}
          />
          <Input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={value as number}
            onChange={(e) => handleChange(Number(e.target.value))}
            className={styles.opacityInput}
          />
        </div>
      );

    case PropertyType.BOOLEAN:
      return (
        <div className={styles.booleanControl}>
          <Checkbox
            checked={value as boolean}
            onCheckedChange={(checked) => handleChange(checked)}
            className={styles.booleanCheckbox}
          />
          <span className={styles.booleanLabel}>
            {value ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      );

    case PropertyType.TEXT:
      return (
        <div className={styles.textControl}>
          <Input
            type="text"
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
            className={styles.textInput}
            placeholder="Enter text..."
          />
        </div>
      );

    default:
      return (
        <div className={styles.defaultControl}>
          <Input
            type="text"
            value={String(value)}
            onChange={(e) => handleChange(e.target.value)}
            className={styles.defaultInput}
          />
        </div>
      );
  }
}

export default function AnimationPropertyPanel({
  selectedProperty,
  onPropertyUpdate,
  onPropertyCreate,
  onPropertyDelete,
}: AnimationPropertyPanelProps) {
  const { currentTime } = useStore(
    useShallow((state) => ({
      currentTime: state.currentTime,
    })),
  );

  const [currentValue, setCurrentValue] = useState<unknown>(null);
  const [isCreatingProperty, setIsCreatingProperty] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyType, setNewPropertyType] = useState<PropertyType>(
    PropertyType.NUMBER,
  );

  // Update current value when property or time changes
  useEffect(() => {
    if (selectedProperty) {
      // Find the value at current time or use default
      const keyframe = selectedProperty.keyframes.find(
        (kf) => kf.time === currentTime,
      );
      setCurrentValue(keyframe?.value || selectedProperty.defaultValue);
    }
  }, [selectedProperty, currentTime]);

  const handleValueChange = useCallback(
    (value: unknown) => {
      setCurrentValue(value);

      if (selectedProperty && onPropertyUpdate) {
        // Create or update keyframe at current time
        const existingKeyframeIndex = selectedProperty.keyframes.findIndex(
          (kf) => kf.time === currentTime,
        );

        const updatedKeyframes = [...selectedProperty.keyframes];

        if (existingKeyframeIndex >= 0) {
          updatedKeyframes[existingKeyframeIndex] = {
            ...updatedKeyframes[existingKeyframeIndex],
            value,
          };
        } else {
          updatedKeyframes.push({
            id: `keyframe-${Date.now()}`,
            time: currentTime,
            value,
            easing: 'easeInOut',
          });
          updatedKeyframes.sort((a, b) => a.time - b.time);
        }

        onPropertyUpdate({
          ...selectedProperty,
          keyframes: updatedKeyframes,
        });
      }
    },
    [selectedProperty, currentTime, onPropertyUpdate],
  );

  const handleCreateProperty = useCallback(() => {
    if (!newPropertyName.trim() || !onPropertyCreate) return;

    const preset =
      ANIMATION_PROPERTY_PRESETS[
        newPropertyType.toUpperCase() as keyof typeof ANIMATION_PROPERTY_PRESETS
      ];

    const newProperty: AnimationProperty = {
      id: `property-${Date.now()}`,
      name: newPropertyName.trim(),
      type: newPropertyType,
      keyframes: [],
      defaultValue: preset?.defaultValue || 0,
      min: preset?.min,
      max: preset?.max,
      step: preset?.step,
    };

    onPropertyCreate(newProperty);
    setIsCreatingProperty(false);
    setNewPropertyName('');
    setNewPropertyType(PropertyType.NUMBER);
  }, [newPropertyName, newPropertyType, onPropertyCreate]);

  const handleDeleteProperty = useCallback(() => {
    if (selectedProperty && onPropertyDelete) {
      onPropertyDelete(selectedProperty.id);
    }
  }, [selectedProperty, onPropertyDelete]);

  const propertyTypeOptions = Object.values(PropertyType).map((type) => ({
    value: type,
    label: type.charAt(0).toUpperCase() + type.slice(1),
  }));

  return (
    <div className={styles.animationPropertyPanel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Animation Properties</h3>
        <button
          type="button"
          className={styles.addPropertyButton}
          onClick={() => setIsCreatingProperty(true)}
          title="Add new property"
        >
          +
        </button>
      </div>

      {isCreatingProperty && (
        <div className={styles.createPropertyForm}>
          <div className={styles.formGroup}>
            <label>Property Name:</label>
            <Input
              type="text"
              value={newPropertyName}
              onChange={(e) => setNewPropertyName(e.target.value)}
              className={styles.propertyNameInput}
              placeholder="Enter property name..."
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label>Property Type:</label>
            <select
              value={newPropertyType}
              onChange={(e) =>
                setNewPropertyType(e.target.value as PropertyType)
              }
              className={styles.propertyTypeSelect}
            >
              {propertyTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.createButton}
              onClick={handleCreateProperty}
              disabled={!newPropertyName.trim()}
            >
              Create
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => {
                setIsCreatingProperty(false);
                setNewPropertyName('');
                setNewPropertyType(PropertyType.NUMBER);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedProperty ? (
        <div className={styles.propertyEditor}>
          <div className={styles.propertyHeader}>
            <div className={styles.propertyInfo}>
              <h4 className={styles.propertyName}>{selectedProperty.name}</h4>
              <span className={styles.propertyType}>
                {selectedProperty.type}
              </span>
            </div>
            <button
              type="button"
              className={styles.deletePropertyButton}
              onClick={handleDeleteProperty}
              title="Delete property"
            >
              ×
            </button>
          </div>

          <div className={styles.propertyControls}>
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Current Value:</label>
              <PropertyControl
                property={selectedProperty}
                value={currentValue}
                onChange={handleValueChange}
              />
            </div>

            <div className={styles.propertyStats}>
              <div className={styles.statItem}>
                <label>Keyframes:</label>
                <span>{selectedProperty.keyframes.length}</span>
              </div>
              <div className={styles.statItem}>
                <label>Default:</label>
                <span>{String(selectedProperty.defaultValue)}</span>
              </div>
              {selectedProperty.min !== undefined && (
                <div className={styles.statItem}>
                  <label>Min:</label>
                  <span>{selectedProperty.min}</span>
                </div>
              )}
              {selectedProperty.max !== undefined && (
                <div className={styles.statItem}>
                  <label>Max:</label>
                  <span>{selectedProperty.max}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.noSelection}>
          <p>No property selected</p>
          <p className={styles.hint}>
            Select a property from the timeline or create a new one to start
            editing.
          </p>
        </div>
      )}
    </div>
  );
}
