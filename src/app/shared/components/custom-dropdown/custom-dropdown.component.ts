import { Component, Input, Output, EventEmitter, forwardRef, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface DropdownOption {
  name: string;
  display: string;
  data?: any;
}

@Component({
  selector: 'app-custom-dropdown',
  templateUrl: './custom-dropdown.component.html',
  styleUrls: ['./custom-dropdown.component.scss'],
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomDropdownComponent),
      multi: true
    }
  ]
})
export class CustomDropdownComponent implements ControlValueAccessor {
  @Input() options: (string | DropdownOption)[] = [];
  @Input() placeholder: string = 'Select an option';
  @Input() disabled: boolean = false;
  @Output() valueChange = new EventEmitter<string>();

  selectedValue: string = '';
  isOpen: boolean = false;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elementRef: ElementRef) {}

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.selectedValue = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggleDropdown(): void {
    if (!this.disabled) {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.onTouched();
      }
    }
  }

  selectOption(option: string | DropdownOption): void {
    const value = typeof option === 'string' ? option : option.name;
    this.selectedValue = value;
    this.isOpen = false;
    this.onChange(value);
    this.valueChange.emit(value);
  }

  getOptionValue(option: string | DropdownOption): string {
    return typeof option === 'string' ? option : option.name;
  }

  getOptionDisplay(option: string | DropdownOption): string {
    return typeof option === 'string' ? option : option.display;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  get displayValue(): string {
    if (!this.selectedValue) {
      return this.placeholder;
    }
    
    // Find the selected option and return its display value
    const selected = this.options.find(opt => 
      typeof opt === 'string' ? opt === this.selectedValue : opt.name === this.selectedValue
    );
    
    if (selected) {
      return typeof selected === 'string' ? selected : selected.display;
    }
    
    return this.selectedValue;
  }
}

