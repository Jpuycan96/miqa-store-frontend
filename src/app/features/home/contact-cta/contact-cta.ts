import { ChangeDetectionStrategy, Component } from '@angular/core';
import { contactWhatsAppUrl } from '../../../core/config/whatsapp';

@Component({
  selector: 'app-contact-cta',
  templateUrl: './contact-cta.html',
  styleUrl: './contact-cta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactCta {
  readonly contactUrl = contactWhatsAppUrl();
}
