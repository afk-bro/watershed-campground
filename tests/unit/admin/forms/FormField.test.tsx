import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormField } from '@/components/admin/shared/forms/FormField';

describe('FormField', () => {
  describe('Rendering', () => {
    it('renders text input with label', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Site Name"
          name="name"
          type="text"
          value="Test Site"
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText('Site Name')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveValue('Test Site');
    });

    it('renders number input', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Max Guests"
          name="maxGuests"
          type="number"
          value={4}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText('Max Guests');
      expect(input).toHaveAttribute('type', 'number');
      expect(input).toHaveValue(4);
    });

    it('renders select input with options', () => {
      const onChange = vi.fn();
      const options = [
        { value: 'rv', label: 'RV' },
        { value: 'tent', label: 'Tent' },
        { value: 'cabin', label: 'Cabin' },
      ];

      render(
        <FormField
          label="Type"
          name="type"
          type="select"
          value="rv"
          onChange={onChange}
          options={options}
        />
      );

      const select = screen.getByLabelText('Type');
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue('rv');
      expect(screen.getByRole('option', { name: 'RV' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Tent' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Cabin' })).toBeInTheDocument();
    });

    it('renders textarea input', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Notes"
          name="notes"
          type="textarea"
          value="Test notes"
          onChange={onChange}
          rows={5}
        />
      );

      const textarea = screen.getByLabelText('Notes');
      expect(textarea.tagName).toBe('TEXTAREA');
      expect(textarea).toHaveValue('Test notes');
      expect(textarea).toHaveAttribute('rows', '5');
    });
  });

  describe('Required Indicator', () => {
    it('shows asterisk when field is required', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Site Name"
          name="name"
          type="text"
          required
          value=""
          onChange={onChange}
        />
      );

      // Find the asterisk in the label
      const label = screen.getByText(/Site Name/);
      const asterisk = label.querySelector('span');
      expect(asterisk).toHaveTextContent('*');
    });

    it('does not show asterisk when field is not required', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Notes"
          name="notes"
          type="text"
          value=""
          onChange={onChange}
        />
      );

      const label = screen.getByText('Notes');
      const asterisk = label.querySelector('span');
      expect(asterisk).toBeNull();
    });
  });

  describe('Hint Text', () => {
    it('displays hint text when provided', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Code"
          name="code"
          type="text"
          value=""
          onChange={onChange}
          hint="Short code for internal use"
        />
      );

      expect(screen.getByText('Short code for internal use')).toBeInTheDocument();
    });

    it('does not display hint when error is present', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Code"
          name="code"
          type="text"
          value=""
          onChange={onChange}
          hint="This is a hint"
          error="This is an error"
        />
      );

      expect(screen.getByText('This is an error')).toBeInTheDocument();
      expect(screen.queryByText('This is a hint')).not.toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('displays error message when provided', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value=""
          onChange={onChange}
          error="Name is required"
        />
      );

      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    it('applies error styling to input', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value=""
          onChange={onChange}
          error="Name is required"
        />
      );

      const input = screen.getByLabelText('Name');
      expect(input).toHaveClass('error-input');
    });
  });

  describe('User Interaction', () => {
    it('calls onChange when text input changes', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value=""
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText('Name');
      fireEvent.change(input, { target: { value: 'New Value' } });

      expect(onChange).toHaveBeenCalledWith('New Value');
    });

    it('calls onChange with number for number input', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Max Guests"
          name="maxGuests"
          type="number"
          value={0}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText('Max Guests');
      fireEvent.change(input, { target: { value: '42' } });

      expect(onChange).toHaveBeenCalledWith(42);
    });

    it('calls onChange with 0 for empty number input', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Max Guests"
          name="maxGuests"
          type="number"
          value={42}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText('Max Guests');
      fireEvent.change(input, { target: { value: '' } });

      expect(onChange).toHaveBeenCalledWith(0);
    });

    it('calls onChange when select value changes', () => {
      const onChange = vi.fn();
      const options = [
        { value: 'rv', label: 'RV' },
        { value: 'tent', label: 'Tent' },
      ];

      render(
        <FormField
          label="Type"
          name="type"
          type="select"
          value="rv"
          onChange={onChange}
          options={options}
        />
      );

      const select = screen.getByLabelText('Type');
      fireEvent.change(select, { target: { value: 'tent' } });

      expect(onChange).toHaveBeenCalledWith('tent');
    });

    it('calls onChange when textarea changes', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Notes"
          name="notes"
          type="textarea"
          value=""
          onChange={onChange}
        />
      );

      const textarea = screen.getByLabelText('Notes');
      fireEvent.change(textarea, { target: { value: 'New notes' } });

      expect(onChange).toHaveBeenCalledWith('New notes');
    });
  });

  describe('Prefix Support', () => {
    it('renders prefix for number input', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Base Rate"
          name="baseRate"
          type="number"
          value={100}
          onChange={onChange}
          prefix="$"
        />
      );

      expect(screen.getByText('$')).toBeInTheDocument();
    });

    it('applies correct padding when prefix is present', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Base Rate"
          name="baseRate"
          type="number"
          value={100}
          onChange={onChange}
          prefix="$"
        />
      );

      const input = screen.getByLabelText('Base Rate');
      expect(input).toHaveClass('pl-8');
    });
  });

  describe('Disabled State', () => {
    it('disables text input when disabled prop is true', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value="Test"
          onChange={onChange}
          disabled
        />
      );

      expect(screen.getByLabelText('Name')).toBeDisabled();
    });

    it('disables select when disabled prop is true', () => {
      const onChange = vi.fn();
      const options = [{ value: 'rv', label: 'RV' }];

      render(
        <FormField
          label="Type"
          name="type"
          type="select"
          value="rv"
          onChange={onChange}
          options={options}
          disabled
        />
      );

      expect(screen.getByLabelText('Type')).toBeDisabled();
    });
  });

  describe('Number Input Attributes', () => {
    it('applies min, max, and step attributes to number input', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Base Rate"
          name="baseRate"
          type="number"
          value={100}
          onChange={onChange}
          min={0}
          max={1000}
          step={0.01}
        />
      );

      const input = screen.getByLabelText('Base Rate');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '1000');
      expect(input).toHaveAttribute('step', '0.01');
    });
  });

  describe('Text Input Attributes', () => {
    it('applies maxLength to text input', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Code"
          name="code"
          type="text"
          value=""
          onChange={onChange}
          maxLength={10}
        />
      );

      const input = screen.getByLabelText('Code');
      expect(input).toHaveAttribute('maxLength', '10');
    });

    it('applies placeholder to text input', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value=""
          onChange={onChange}
          placeholder="e.g., Riverfront Site 1"
        />
      );

      expect(screen.getByPlaceholderText('e.g., Riverfront Site 1')).toBeInTheDocument();
    });
  });

  describe('Custom Class Names', () => {
    it('applies custom className to wrapper', () => {
      const onChange = vi.fn();
      const { container } = render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value=""
          onChange={onChange}
          className="custom-wrapper-class"
        />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-wrapper-class');
    });

    it('applies custom inputClassName to input', () => {
      const onChange = vi.fn();
      render(
        <FormField
          label="Code"
          name="code"
          type="text"
          value=""
          onChange={onChange}
          inputClassName="uppercase"
        />
      );

      const input = screen.getByLabelText('Code');
      expect(input).toHaveClass('uppercase');
    });
  });
});
