/** Locale-aware labels for all document types in the DES Systems multilanguage document platform. */

import type { SupportedLocale } from '@/lib/comm/resolve-locale';

type DocLabelSet = {
  title: string;
  number: string;
  date: string;
  dueDate: string;
  customer: string;
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
  subtotal: string;
  vat: string;
  vatRate: string;
  grandTotal: string;
  status: string;
  page: string;
  of: string;
  paymentTerms: string;
  bankAccount: string;
  reference: string;
  validUntil: string;
  deliveryDate: string;
  signature: string;
  signedBy: string;
  signedAt: string;
};

export const DOC_LABELS: Record<SupportedLocale, DocLabelSet> = {
  en: {
    title: 'Document',
    number: 'Number',
    date: 'Date',
    dueDate: 'Due Date',
    customer: 'Customer',
    description: 'Description',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    total: 'Total',
    subtotal: 'Subtotal',
    vat: 'VAT',
    vatRate: 'VAT Rate',
    grandTotal: 'Grand Total',
    status: 'Status',
    page: 'Page',
    of: 'of',
    paymentTerms: 'Payment Terms',
    bankAccount: 'Bank Account',
    reference: 'Reference',
    validUntil: 'Valid Until',
    deliveryDate: 'Delivery Date',
    signature: 'Signature',
    signedBy: 'Signed by',
    signedAt: 'Signed at',
  },
  nl: {
    title: 'Document',
    number: 'Nummer',
    date: 'Datum',
    dueDate: 'Vervaldatum',
    customer: 'Klant',
    description: 'Omschrijving',
    quantity: 'Aantal',
    unitPrice: 'Eenheidsprijs',
    total: 'Totaal',
    subtotal: 'Subtotaal',
    vat: 'BTW',
    vatRate: 'BTW-tarief',
    grandTotal: 'Totaalbedrag',
    status: 'Status',
    page: 'Pagina',
    of: 'van',
    paymentTerms: 'Betalingsvoorwaarden',
    bankAccount: 'Bankrekening',
    reference: 'Referentie',
    validUntil: 'Geldig tot',
    deliveryDate: 'Leverdatum',
    signature: 'Handtekening',
    signedBy: 'Ondertekend door',
    signedAt: 'Ondertekend op',
  },
  de: {
    title: 'Dokument',
    number: 'Nummer',
    date: 'Datum',
    dueDate: 'Fälligkeitsdatum',
    customer: 'Kunde',
    description: 'Beschreibung',
    quantity: 'Menge',
    unitPrice: 'Einzelpreis',
    total: 'Gesamt',
    subtotal: 'Zwischensumme',
    vat: 'MwSt.',
    vatRate: 'MwSt.-Satz',
    grandTotal: 'Gesamtbetrag',
    status: 'Status',
    page: 'Seite',
    of: 'von',
    paymentTerms: 'Zahlungsbedingungen',
    bankAccount: 'Bankverbindung',
    reference: 'Referenz',
    validUntil: 'Gültig bis',
    deliveryDate: 'Lieferdatum',
    signature: 'Unterschrift',
    signedBy: 'Unterzeichnet von',
    signedAt: 'Unterzeichnet am',
  },
  fr: {
    title: 'Document',
    number: 'Numéro',
    date: 'Date',
    dueDate: 'Date d\'échéance',
    customer: 'Client',
    description: 'Description',
    quantity: 'Quantité',
    unitPrice: 'Prix unitaire',
    total: 'Total',
    subtotal: 'Sous-total',
    vat: 'TVA',
    vatRate: 'Taux de TVA',
    grandTotal: 'Total général',
    status: 'Statut',
    page: 'Page',
    of: 'de',
    paymentTerms: 'Conditions de paiement',
    bankAccount: 'Compte bancaire',
    reference: 'Référence',
    validUntil: 'Valable jusqu\'au',
    deliveryDate: 'Date de livraison',
    signature: 'Signature',
    signedBy: 'Signé par',
    signedAt: 'Signé le',
  },
  tr: {
    title: 'Belge',
    number: 'Numara',
    date: 'Tarih',
    dueDate: 'Vade Tarihi',
    customer: 'Müşteri',
    description: 'Açıklama',
    quantity: 'Miktar',
    unitPrice: 'Birim Fiyat',
    total: 'Toplam',
    subtotal: 'Ara Toplam',
    vat: 'KDV',
    vatRate: 'KDV Oranı',
    grandTotal: 'Genel Toplam',
    status: 'Durum',
    page: 'Sayfa',
    of: '/',
    paymentTerms: 'Ödeme Koşulları',
    bankAccount: 'Banka Hesabı',
    reference: 'Referans',
    validUntil: 'Geçerlilik Tarihi',
    deliveryDate: 'Teslimat Tarihi',
    signature: 'İmza',
    signedBy: 'İmzalayan',
    signedAt: 'İmza Tarihi',
  },
};

export const DOC_TYPE_TITLES: Record<string, Record<SupportedLocale, string>> = {
  order: {
    en: 'Order Confirmation',
    nl: 'Orderbevestiging',
    de: 'Auftragsbestätigung',
    fr: 'Confirmation de commande',
    tr: 'Sipariş Onayı',
  },
  quotation: {
    en: 'Quotation',
    nl: 'Offerte',
    de: 'Angebot',
    fr: 'Devis',
    tr: 'Teklif',
  },
  invoice: {
    en: 'Invoice',
    nl: 'Factuur',
    de: 'Rechnung',
    fr: 'Facture',
    tr: 'Fatura',
  },
  credit_note: {
    en: 'Credit Note',
    nl: 'Creditnota',
    de: 'Gutschrift',
    fr: 'Avoir',
    tr: 'Alacak Dekontu',
  },
  handover: {
    en: 'Delivery Certificate',
    nl: 'Afleverbon',
    de: 'Übergabeprotokoll',
    fr: 'Bon de livraison',
    tr: 'Teslimat Belgesi',
  },
};
