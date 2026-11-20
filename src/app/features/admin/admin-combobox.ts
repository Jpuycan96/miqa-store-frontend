import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

export interface AdminComboboxOption {
  readonly id: string;
  readonly label: string;
}

@Component({
  selector: 'app-admin-combobox',
  templateUrl: './admin-combobox.html',
  styleUrl: './admin-combobox.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCombobox {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input.required<readonly AdminComboboxOption[]>();
  readonly value = input('');
  readonly placeholder = input('');
  readonly emptyMessage = input('No hay opciones que coincidan.');
  readonly disabled = input(false);
  readonly required = input(false);
  readonly invalid = input(false);
  readonly valueSelected = output<string>();
  readonly blurred = output<void>();

  readonly opened = signal(false);
  readonly query = signal('');
  readonly activeIndex = signal(-1);
  readonly selectedLabel = computed(() => this.options().find(option => option.id === this.value())?.label ?? '');
  private readonly searchable = computed(() => this.options().map(option => ({
    option, folded: fold(option.label),
  })));
  readonly matches = computed(() => {
    const term = fold(this.query().trim());
    return this.searchable().filter(entry => entry.folded.includes(term)).map(entry => entry.option);
  });
  readonly activeOption = computed(() => this.opened() ? this.matches()[this.activeIndex()] : undefined);

  open(): void {
    if (this.disabled() || this.opened()) return;
    this.query.set('');
    this.opened.set(true);
  }

  search(value: string): void {
    this.open();
    this.query.set(value);
    this.activeIndex.set(-1);
  }

  close(): void {
    this.opened.set(false);
    this.activeIndex.set(-1);
  }

  onBlur(): void {
    this.close();
    this.blurred.emit();
  }

  optionId(option: AdminComboboxOption): string {
    return this.fieldId() + '-option-' + option.id;
  }

  select(option: AdminComboboxOption): void {
    if (this.disabled()) return;
    this.valueSelected.emit(option.id);
    this.close();
  }

  onKey(event: KeyboardEvent, field: HTMLInputElement): void {
    if (event.isComposing) return;
    if (event.key === 'Escape' && this.opened()) {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.open();
      const last = this.matches().length - 1;
      if (last < 0) return;
      const current = this.activeIndex();
      const next = event.key === 'ArrowDown' ? Math.min(last, current + 1)
        : current < 0 ? last : Math.max(0, current - 1);
      this.activeIndex.set(next);
      const option = this.matches()[next];
      field.ownerDocument.getElementById(this.optionId(option))?.scrollIntoView?.({ block: 'nearest' });
    } else if (event.key === 'Enter' && this.opened()) {
      event.preventDefault();
      const option = this.activeOption();
      if (option) this.select(option);
    }
  }
}

function fold(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
