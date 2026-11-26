// Textos del correo que recibe el cliente al pedir una cita desde la web, en
// cada idioma de la web. El idioma llega en la petición (`lang`) y queda en
// `req.lang`; sin idioma o con uno desconocido se usa el español.

const TEXTS = {
  es: {
    subject: "Tu solicitud de cita con GVRE",
    title: "Hemos recibido tu solicitud",
    hello: (name) => `Hola ${name},`,
    received: (ref) =>
      `Hemos recibido correctamente tu solicitud de cita para visitar el inmueble <strong>${ref || "solicitado"}</strong>.`,
    date: "Día propuesto",
    time: "Hora propuesta",
    next: (consultant) =>
      `En breve, el consultor/a encargado de este inmueble (${consultant}) se pondrá en contacto contigo para <strong>confirmar definitivamente la cita e indicarte la dirección exacta</strong>, o sugerir alternativas si no hubiera disponibilidad.`,
    regards: "Un saludo,",
    team: "El equipo de GVRE",
    footer:
      "Este es un correo automático, por favor no respondas a esta dirección. Si tienes dudas, contáctanos en info@gvre.es.",
  },
  en: {
    subject: "Your viewing request with GVRE",
    title: "We have received your request",
    hello: (name) => `Hello ${name},`,
    received: (ref) =>
      `We have successfully received your request to view the property <strong>${ref || "you selected"}</strong>.`,
    date: "Proposed date",
    time: "Proposed time",
    next: (consultant) =>
      `The consultant in charge of this property (${consultant}) will contact you shortly to <strong>confirm the appointment and give you the exact address</strong>, or to suggest alternatives if that slot is not available.`,
    regards: "Kind regards,",
    team: "The GVRE team",
    footer:
      "This is an automated email, please do not reply to this address. If you have any questions, contact us at info@gvre.es.",
  },
  fr: {
    subject: "Votre demande de visite auprès de GVRE",
    title: "Nous avons bien reçu votre demande",
    hello: (name) => `Bonjour ${name},`,
    received: (ref) =>
      `Nous avons bien reçu votre demande de rendez-vous pour visiter le bien <strong>${ref || "sélectionné"}</strong>.`,
    date: "Date proposée",
    time: "Heure proposée",
    next: (consultant) =>
      `Le consultant ou la consultante en charge de ce bien (${consultant}) vous contactera très prochainement pour <strong>confirmer le rendez-vous et vous indiquer l’adresse exacte</strong>, ou vous proposer d’autres créneaux si celui-ci n’est pas disponible.`,
    regards: "Bien cordialement,",
    team: "L’équipe GVRE",
    footer:
      "Ceci est un e-mail automatique, merci de ne pas répondre à cette adresse. Pour toute question, contactez-nous à info@gvre.es.",
  },
  de: {
    subject: "Ihre Besichtigungsanfrage bei GVRE",
    title: "Wir haben Ihre Anfrage erhalten",
    hello: (name) => `Guten Tag ${name},`,
    received: (ref) =>
      `wir haben Ihre Anfrage für eine Besichtigung der Immobilie <strong>${ref || "Ihrer Wahl"}</strong> erhalten.`,
    date: "Vorgeschlagener Tag",
    time: "Vorgeschlagene Uhrzeit",
    next: (consultant) =>
      `In Kürze wird sich der für diese Immobilie zuständige Berater bzw. die zuständige Beraterin (${consultant}) mit Ihnen in Verbindung setzen, um <strong>den Termin zu bestätigen und Ihnen die genaue Adresse mitzuteilen</strong> oder Alternativen vorzuschlagen, falls der Termin nicht verfügbar ist.`,
    regards: "Mit freundlichen Grüßen",
    team: "Ihr GVRE-Team",
    footer:
      "Dies ist eine automatisch versendete E-Mail. Bitte antworten Sie nicht an diese Adresse. Bei Fragen erreichen Sie uns unter info@gvre.es.",
  },
};

const getBookingEmailTexts = (lang) => TEXTS[lang] || TEXTS.es;

module.exports = { getBookingEmailTexts, BOOKING_EMAIL_TEXTS: TEXTS };
