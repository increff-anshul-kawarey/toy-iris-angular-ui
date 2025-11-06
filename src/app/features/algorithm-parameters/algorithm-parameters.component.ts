import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { debounceTime, distinctUntilChanged, takeUntil, Subject } from 'rxjs';

import { AlgorithmParametersService, AlgorithmParameters } from '../../shared/services/algorithm-parameters.service';
import { DashboardService } from '../../shared/services/dashboard.service';
import { TaskService } from '../../shared/services/task.service';
import { NotificationService } from '../../shared/services/notification.service';
import { CustomDropdownComponent, DropdownOption } from '../../shared/components/custom-dropdown/custom-dropdown.component';

@Component({
  selector: 'app-algorithm-parameters',
  templateUrl: './algorithm-parameters.component.html',
  styleUrls: ['./algorithm-parameters.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CustomDropdownComponent
  ]
})
export class AlgorithmParametersComponent implements OnInit, OnDestroy {
  parametersForm: FormGroup;
  isRunning = false;
  isSaving = false;
  availableParameterSets: DropdownOption[] = [];
  selectedParameterSet = 'default';
  showSaveAsModal = false;
  newParameterSetName = '';
  private destroy$ = new Subject<void>();
  private isAutoSaving = false;
  private isSavingAsNew = false;

  // Custom validators for text inputs that should contain numbers
  private static numericValidator(min?: number, max?: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return { required: true };
      }
      
      const value = control.value.toString().trim();
      const numValue = parseFloat(value);
      
      // Check if it's a valid number
      if (isNaN(numValue)) {
        return { invalidNumber: { value: control.value } };
      }
      
      // Check if it's a valid decimal number
      if (!/^\d*\.?\d+$/.test(value)) {
        return { invalidFormat: { value: control.value } };
      }
      
      // Check min/max constraints
      if (min !== undefined && numValue < min) {
        return { min: { min, actual: numValue } };
      }
      
      if (max !== undefined && numValue > max) {
        return { max: { max, actual: numValue } };
      }
      
      return null;
    };
  }

  private static integerValidator(min?: number, max?: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return { required: true };
      }
      
      const value = control.value.toString().trim();
      const numValue = parseInt(value, 10);
      
      // Check if it's a valid integer
      if (isNaN(numValue) || !Number.isInteger(numValue)) {
        return { invalidInteger: { value: control.value } };
      }
      
      // Check if it's a valid integer format (no decimals)
      if (!/^\d+$/.test(value)) {
        return { invalidFormat: { value: control.value } };
      }
      
      // Check min/max constraints
      if (min !== undefined && numValue < min) {
        return { min: { min, actual: numValue } };
      }
      
      if (max !== undefined && numValue > max) {
        return { max: { max, actual: numValue } };
      }
      
      return null;
    };
  }

  // Validator for percentage inputs (0-100)
  private static percentageValidator(min: number = 0, max: number = 100) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return { required: true };
      }
      
      const value = control.value.toString().trim();
      const numValue = parseFloat(value);
      
      // Check if it's a valid number
      if (isNaN(numValue)) {
        return { invalidNumber: { value: control.value } };
      }
      
      // Check if it's a valid decimal number
      if (!/^\d*\.?\d+$/.test(value)) {
        return { invalidFormat: { value: control.value } };
      }
      
      // Check min/max constraints
      if (numValue < min) {
        return { min: { min, actual: numValue } };
      }
      
      if (numValue > max) {
        return { max: { max, actual: numValue } };
      }
      
      return null;
    };
  }

  constructor(
    private fb: FormBuilder,
    private algorithmParamsService: AlgorithmParametersService,
    private dashboardService: DashboardService,
    private taskService: TaskService,
    private notificationService: NotificationService
  ) {
    this.parametersForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadDefaultParameters();
    this.loadParameterSets();
    this.setupAutoSave();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      parameterSetName: ['default', Validators.required],
      liquidationThreshold: ['25', [AlgorithmParametersComponent.percentageValidator(0, 100)]],
      bestsellerMultiplier: ['1.20', [AlgorithmParametersComponent.numericValidator(1, 5)]],
      minVolumeThreshold: ['25', [AlgorithmParametersComponent.integerValidator(1)]],
      consistencyThreshold: ['75', [AlgorithmParametersComponent.percentageValidator(0, 100)]],
      analysisStartDate: ['2019-01-01', Validators.required],
      analysisEndDate: ['2019-06-23', Validators.required],
      coreDurationMonths: ['6', [AlgorithmParametersComponent.integerValidator(1, 24)]],
      bestsellerDurationDays: ['90', [AlgorithmParametersComponent.integerValidator(1, 365)]]
    });
  }

  private loadDefaultParameters(): void {
    this.algorithmParamsService.getDefaultParameters().subscribe({
      next: (params) => {
        this.selectedParameterSet = params.parameterSetName;
        this.parametersForm.patchValue({
          parameterSetName: params.parameterSetName,
          liquidationThreshold: this.decimalToPercentage(params.liquidationThreshold),
          bestsellerMultiplier: params.bestsellerMultiplier.toString(),
          minVolumeThreshold: params.minVolumeThreshold.toString(),
          consistencyThreshold: this.decimalToPercentage(params.consistencyThreshold),
          analysisStartDate: this.formatDateForInput(params.analysisStartDate),
          analysisEndDate: this.formatDateForInput(params.analysisEndDate),
          coreDurationMonths: params.coreDurationMonths.toString(),
          bestsellerDurationDays: params.bestsellerDurationDays.toString()
        });
      },
      error: (error) => {
        console.error('Error loading default parameters:', error);
        this.notificationService.error('Load Failed', 'Failed to load default parameters');
      }
    });
  }

  private loadParameterSets(): void {
    // Load both active and inactive parameter sets
    this.algorithmParamsService.getRecentParameterSets(50).subscribe({
      next: (sets) => {
        // Store full parameter data for dropdown display
        this.availableParameterSets = sets.map(set => ({
          name: set.parameterSetName,
          display: `${set.parameterSetName} (LT:${set.liquidationThreshold * 100}% BM:${set.bestsellerMultiplier} MV:${set.minVolumeThreshold} CT:${set.consistencyThreshold * 100}%)`,
          data: set
        }));
        // If no parameter sets are available, add default
        if (this.availableParameterSets.length === 0) {
          this.availableParameterSets = [{ 
            name: 'default', 
            display: 'default (LT:25% BM:1.20 MV:25 CT:75%)', 
            data: null 
          }];
        }
        // Set the first available parameter set as selected if none is selected
        if (!this.selectedParameterSet && this.availableParameterSets.length > 0) {
          this.selectedParameterSet = this.availableParameterSets[0].name;
        }
      },
      error: (error) => {
        console.error('Error loading parameter sets:', error);
        this.availableParameterSets = [{ 
          name: 'default', 
          display: 'default (LT:25% BM:1.20 MV:25 CT:75%)', 
          data: null 
        }];
        this.selectedParameterSet = 'default';
        this.notificationService.warning('Connection Issue', 'Using default parameters. Backend connection failed.');
      }
    });
  }

  onParameterSetChange(parameterSet: string): void {
    if (!parameterSet) return;
    
    this.selectedParameterSet = parameterSet;
    
    // Show loading state
    this.notificationService.info('Loading', `Loading parameter set: ${parameterSet}`);
    
    // First, activate the parameter set (this will deactivate others)
    this.algorithmParamsService.activateParameterSet(parameterSet).subscribe({
      next: (activatedParams) => {
        // Now load the parameter set
        this.parametersForm.patchValue({
          parameterSetName: activatedParams.parameterSetName,
          liquidationThreshold: this.decimalToPercentage(activatedParams.liquidationThreshold),
          bestsellerMultiplier: activatedParams.bestsellerMultiplier.toString(),
          minVolumeThreshold: activatedParams.minVolumeThreshold.toString(),
          consistencyThreshold: this.decimalToPercentage(activatedParams.consistencyThreshold),
          analysisStartDate: this.formatDateForInput(activatedParams.analysisStartDate),
          analysisEndDate: this.formatDateForInput(activatedParams.analysisEndDate),
          coreDurationMonths: activatedParams.coreDurationMonths.toString(),
          bestsellerDurationDays: activatedParams.bestsellerDurationDays.toString()
        });
        
        this.notificationService.success('Loaded & Activated', `Parameter set '${parameterSet}' is now active`);
      },
      error: (error) => {
        console.error(`Error loading/activating parameter set ${parameterSet}:`, error);
        this.notificationService.error('Load Failed', `Failed to load parameter set: ${parameterSet}. Using default values.`);
        
        // Fallback to default values
        this.resetToDefaults();
      }
    });
  }

  private setupAutoSave(): void {
    // Auto-save parameter changes with debounce
    this.parametersForm.valueChanges
      .pipe(
        debounceTime(2000), // Wait 2 seconds after user stops typing
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.parametersForm.valid && !this.isAutoSaving && this.selectedParameterSet) {
          this.autoSaveParameters();
        }
      });
  }

  private autoSaveParameters(): void {
    // Don't auto-save if we're in the process of saving as a new config
    if (this.isAutoSaving || this.isSavingAsNew) return;
    
    this.isAutoSaving = true;
    const formValue = this.parametersForm.value;
    const parameters: AlgorithmParameters = {
      ...formValue,
      liquidationThreshold: this.percentageToDecimal(formValue.liquidationThreshold),
      bestsellerMultiplier: parseFloat(formValue.bestsellerMultiplier),
      minVolumeThreshold: parseFloat(formValue.minVolumeThreshold),
      consistencyThreshold: this.percentageToDecimal(formValue.consistencyThreshold),
      coreDurationMonths: parseInt(formValue.coreDurationMonths, 10),
      bestsellerDurationDays: parseInt(formValue.bestsellerDurationDays, 10),
      analysisStartDate: new Date(formValue.analysisStartDate),
      analysisEndDate: new Date(formValue.analysisEndDate),
      isActive: true,
      lastUpdated: new Date()
    };

    // Update existing parameter set instead of creating new one
    this.algorithmParamsService.updateParameterSet(this.selectedParameterSet, parameters).subscribe({
      next: (savedParams: any) => {
        this.isAutoSaving = false;
        this.notificationService.info('Auto-saved', 'Parameters updated automatically');
      },
      error: (error: any) => {
        this.isAutoSaving = false;
        console.error('Error auto-saving parameters:', error);
        // Don't show error notification for auto-save failures
      }
    });
  }


  runAlgorithm(): void {
    if (this.parametersForm.valid) {
      this.isRunning = true;
      const formValue = this.parametersForm.value;
      const parameters: AlgorithmParameters = {
        ...formValue,
        liquidationThreshold: this.percentageToDecimal(formValue.liquidationThreshold),
        bestsellerMultiplier: parseFloat(formValue.bestsellerMultiplier),
        minVolumeThreshold: parseFloat(formValue.minVolumeThreshold),
        consistencyThreshold: this.percentageToDecimal(formValue.consistencyThreshold),
        coreDurationMonths: parseInt(formValue.coreDurationMonths, 10),
        bestsellerDurationDays: parseInt(formValue.bestsellerDurationDays, 10),
        analysisStartDate: new Date(formValue.analysisStartDate),
        analysisEndDate: new Date(formValue.analysisEndDate),
        isActive: true,
        lastUpdated: new Date()
      };

      this.dashboardService.runNoosAlgorithm(parameters).subscribe({
        next: (task) => {
          this.isRunning = false;
          this.notificationService.success('Algorithm Started', `Algorithm started successfully. Task ID: ${task.id}`);
          // Optionally redirect to task monitoring or refresh dashboard
        },
        error: (error) => {
          this.isRunning = false;
          console.error('Error running algorithm:', error);
          this.notificationService.error('Start Failed', 'Failed to start algorithm');
        }
      });
    } else {
      this.notificationService.warning('Validation Error', 'Please fill in all required fields correctly');
    }
  }

  resetToDefaults(): void {
    this.parametersForm.patchValue({
      liquidationThreshold: '25',
      bestsellerMultiplier: '1.20',
      minVolumeThreshold: '25',
      consistencyThreshold: '75',
      analysisStartDate: '2019-01-01',
      analysisEndDate: '2019-06-23',
      coreDurationMonths: '6',
      bestsellerDurationDays: '90'
    });
  }

  openSaveAsModal(): void {
    this.newParameterSetName = '';
    this.showSaveAsModal = true;
  }

  closeSaveAsModal(): void {
    this.showSaveAsModal = false;
    this.newParameterSetName = '';
  }

  confirmSaveAsNew(): void {
    if (!this.newParameterSetName || !this.newParameterSetName.trim()) {
      this.notificationService.warning('Invalid Name', 'Please enter a name for the new configuration');
      return;
    }

    if (this.parametersForm.valid) {
      // Set flag to prevent auto-save from updating the old parameter set
      this.isSavingAsNew = true;
      this.isSaving = true;
      
      const formValue = this.parametersForm.value;
      const parameters: AlgorithmParameters = {
        ...formValue,
        parameterSetName: this.newParameterSetName.trim(),
        liquidationThreshold: this.percentageToDecimal(formValue.liquidationThreshold),
        bestsellerMultiplier: parseFloat(formValue.bestsellerMultiplier),
        minVolumeThreshold: parseFloat(formValue.minVolumeThreshold),
        consistencyThreshold: this.percentageToDecimal(formValue.consistencyThreshold),
        coreDurationMonths: parseInt(formValue.coreDurationMonths, 10),
        bestsellerDurationDays: parseInt(formValue.bestsellerDurationDays, 10),
        analysisStartDate: new Date(formValue.analysisStartDate),
        analysisEndDate: new Date(formValue.analysisEndDate),
        isActive: true,
        lastUpdated: new Date()
      };

      this.algorithmParamsService.saveParameterSet(parameters).subscribe({
        next: (savedParams) => {
          this.isSaving = false;
          this.isSavingAsNew = false;
          this.closeSaveAsModal();
          this.notificationService.success('Save Complete', `Configuration '${savedParams.parameterSetName}' saved successfully`);
          this.loadParameterSets();
          // Update selected parameter set to the newly created one
          this.selectedParameterSet = savedParams.parameterSetName;
        },
        error: (error) => {
          this.isSaving = false;
          this.isSavingAsNew = false;
          console.error('Error saving parameters:', error);
          this.notificationService.error('Save Failed', 'Failed to save new configuration');
        }
      });
    } else {
      this.notificationService.warning('Validation Error', 'Please fill in all required fields correctly');
    }
  }

  /**
   * Format date for HTML date input (yyyy-MM-dd)
   */
  private formatDateForInput(date: Date | string): string {
    if (typeof date === 'string') {
      // If it's already a string, extract just the date part
      return date.split('T')[0];
    }
    // Convert Date object to yyyy-MM-dd format
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Convert decimal (0.25) to percentage (25) for display
   */
  private decimalToPercentage(decimal: number): string {
    return (decimal * 100).toString();
  }

  /**
   * Convert percentage (25) to decimal (0.25) for storage
   */
  private percentageToDecimal(percentage: string | number): number {
    const numValue = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
    return numValue / 100;
  }

  getFieldError(fieldName: string): string {
    const field = this.parametersForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['invalidNumber']) return `${fieldName} must be a valid number`;
      if (field.errors['invalidInteger']) return `${fieldName} must be a valid whole number`;
      if (field.errors['invalidFormat']) return `${fieldName} must be a valid number format`;
      if (field.errors['min']) return `${fieldName} must be at least ${field.errors['min'].min}`;
      if (field.errors['max']) return `${fieldName} must be at most ${field.errors['max'].max}`;
    }
    return '';
  }

  getIconName(materialIcon: string): string {
    // Return Material Icon names directly - they will be styled by global CSS
    return materialIcon;
  }
}
