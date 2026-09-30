import { afterNextRender, DOCUMENT, inject, Injectable, Injector, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { STORE_API_CONFIG } from '../config/store-api';
import { whatsAppUrl } from '../config/whatsapp';
import { QuoteStore } from './quote-store';
import { buildQuoteMessage } from './quote-utils';
import { QuoteReceipt, QuoteRequest, quoteRequest, requestLimitError } from './quote-request';

export const SUBMISSION_STORAGE_KEY = 'miqa.quote-submission.v1';
interface Attempt { key: string; request: QuoteRequest; message: string; }
interface Confirmed { receipt: QuoteReceipt; url: string; }

@Injectable({ providedIn: 'root' })
export class QuoteSubmission {
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly config = inject(STORE_API_CONFIG);
  readonly quote = inject(QuoteStore);
  readonly state = signal<'idle' | 'sending' | 'success' | 'error'>('idle');
  readonly error = signal('');
  readonly storageWarning = signal('');
  readonly pending = signal<Attempt | null>(null);
  readonly confirmed = signal<Confirmed | null>(null);
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(160), Validators.pattern(/\S/)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(32), control => {
      const value = String(control.value);
      return /^\+?[0-9 ()-]+$/.test(value) && /^\+?[0-9]{7,15}$/.test(value.replace(/[ ()-]/g, '')) ? null : { phone: true };
    }] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email, Validators.maxLength(254)] }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] })
  });

  constructor() {
    // Panel and drawer can coexist. A view edit normally skips model-to-view
    // callbacks; notify both control accessors without emitting another change.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(value => this.form.patchValue(value, { emitEvent: false }));
    afterNextRender(() => this.restore());
  }

  submit(): void {
    if (this.state() === 'sending' || this.confirmed()) return;
    let attempt = this.pending();
    if (!attempt) {
      this.form.markAllAsTouched();
      if (this.form.invalid) { this.error.set('Revisa tu nombre, teléfono y email antes de enviar.'); return; }
      const values = this.form.getRawValue();
      const request = quoteRequest(this.quote.items(), values, values.notes);
      const error = requestLimitError(request);
      if (error) { this.error.set(error); return; }
      const crypto = this.document.defaultView?.crypto;
      if (!crypto?.getRandomValues) { this.error.set('No se pudo preparar el envío seguro. Inténtalo en otro navegador.'); return; }
      // getRandomValues also works on local HTTP; no Math.random fallback.
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
      const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
      const key = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      attempt = { key, request, message: buildQuoteMessage(this.quote.items()) + (request.notes ? `\n\nNotas generales: ${request.notes}` : '') };
      this.pending.set(attempt);
    }
    this.save(); // Persist immutable payload BEFORE the request, including uncertain outcomes.
    this.error.set(''); this.state.set('sending'); this.form.disable();
    const submitted = attempt;
    this.injector.get(HttpClient).post<QuoteReceipt>(`${this.config.baseUrl.replace(/\/$/, '')}/api/public/quote-requests${submitted.request.schemaVersion === 2 ? '/v2' : ''}`, submitted.request,
      { headers: { 'Idempotency-Key': submitted.key } }).pipe(timeout(30000)).subscribe({
      next: receipt => {
        if (!receipt || !/^MIQA-[0-9]{6,}$/.test(receipt.reference) || !Number.isFinite(Date.parse(receipt.receivedAt))) {
          this.failed('No pudimos confirmar la respuesta. Reintenta el mismo envío para recuperar su referencia.'); return;
        }
        const url = whatsAppUrl(`Solicitud ${receipt.reference}\n\n${submitted.message}`);
        this.confirmed.set({ receipt, url }); this.pending.set(null); this.state.set('success');
        this.form.reset(); this.save();
        // Popup blocking is harmless: the confirmed link remains available without another POST.
        try { this.document.defaultView?.open(url, '_blank', 'noopener,noreferrer'); } catch { /* use the visible link */ }
      },
      error: (failure: unknown) => {
        const status = failure instanceof HttpErrorResponse ? failure.status : 0;
        const messages: Record<number, string> = {
          400: 'Revisa el contacto y la configuración. Puedes modificar la solicitud y volver a enviarla.',
          409: 'El catálogo cambió o el envío tiene un conflicto. Revisa los productos antes de modificar la solicitud.',
          413: 'La solicitud es demasiado extensa. Reduce productos o notas antes de volver a enviarla.',
          429: 'Hay demasiados envíos. Espera un minuto y reintenta la misma solicitud.'
        };
        this.failed(messages[status] ?? 'No pudimos confirmar el guardado. Reintenta el mismo envío; tu cotización sigue aquí.');
      }
    });
  }

  /** Explicit user action: never silently replace a key after a timeout or a cart edit. */
  startNew(): void {
    if (this.state() === 'sending') return;
    if (this.pending() && !this.document.defaultView?.confirm('El envío anterior podría haberse registrado. Reintentar conserva su referencia. ¿Quieres iniciar una solicitud diferente?')) return;
    this.pending.set(null); this.confirmed.set(null); this.error.set(''); this.state.set('idle'); this.form.enable(); this.save();
  }

  private failed(message: string) { this.state.set('error'); this.error.set(message); this.save(); }
  private save(): void {
    try {
      const storage = this.document.defaultView?.sessionStorage;
      if (!storage) throw new Error('Unavailable');
      if (!this.pending() && !this.confirmed()) storage.removeItem(SUBMISSION_STORAGE_KEY);
      else storage.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify({ pending: this.pending(), confirmed: this.confirmed() }));
      this.storageWarning.set('');
    } catch { this.storageWarning.set('Conserva esta pestaña abierta: no pudimos guardar el intento para recuperarlo al recargar.'); }
  }

  restore(): void {
    if (this.state() !== 'idle' || this.pending() || this.confirmed()) return;
    try {
      const raw = this.document.defaultView?.sessionStorage.getItem(SUBMISSION_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { pending?: Attempt; confirmed?: Confirmed };
      const attempt = saved.pending;
      if (attempt && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attempt.key)
        && attempt.request?.contact && Array.isArray(attempt.request.items) && typeof attempt.message === 'string') {
        this.pending.set(attempt); this.form.patchValue({ ...attempt.request.contact, notes: attempt.request.notes ?? '' });
        this.form.disable(); this.failed('Hay un envío pendiente de confirmación. Reinténtalo para recuperar su referencia.');
      } else if (saved.confirmed && /^MIQA-[0-9]{6,}$/.test(saved.confirmed.receipt?.reference)
        && saved.confirmed.url.startsWith('https://wa.me/')) {
        this.confirmed.set(saved.confirmed); this.state.set('success'); this.form.disable();
      }
    } catch { this.storageWarning.set('No pudimos recuperar el envío anterior de esta pestaña.'); }
  }
}
