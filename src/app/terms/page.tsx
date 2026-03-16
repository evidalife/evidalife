import LegalLayout from '@/components/LegalLayout';

export const metadata = {
  title: 'Nutzungsbedingungen – Evida Life',
};

export default function TermsPage() {
  return (
    <LegalLayout
      title="Nutzungsbedingungen"
      subtitle="Allgemeine Geschäftsbedingungen"
      lastUpdated="März 2026"
    >

      <h2>1. Geltungsbereich</h2>
      <p>
        Diese Nutzungsbedingungen gelten für die Nutzung der Evida Life Plattform, betrieben von
        der <strong>Evida Life AG</strong>, Zürich, Schweiz («Evida Life», «wir», «uns»). Mit der
        Registrierung oder Nutzung der Plattform akzeptierst du diese Bedingungen.
      </p>

      <h2>2. Leistungsbeschreibung</h2>
      <p>
        Evida Life ist eine digitale Gesundheitsplattform, die folgende Funktionen anbietet:
      </p>
      <ul>
        <li>Erfassung und Auswertung von Laborwerten und Biomarkern</li>
        <li>Daily Dozen Tracker für pflanzenbasierte Ernährung</li>
        <li>Rezeptdatenbank mit evidenzbasierten Ernährungsempfehlungen</li>
        <li>Evidenzbasierte Gesundheitsartikel</li>
      </ul>
      <div className="placeholder">
        [Platzhalter: Vollständige Leistungsbeschreibung wird mit Launch der App ergänzt.]
      </div>

      <h2>3. Nutzerkonten</h2>
      <p>
        Für die Nutzung der Plattform ist eine Registrierung mit einer gültigen E-Mail-Adresse
        erforderlich. Du bist für die Sicherheit deines Kontos und die Vertraulichkeit deines
        Passworts verantwortlich. Bitte informiere uns unverzüglich bei Anzeichen einer
        unbefugten Nutzung.
      </p>

      <h3>Mindestalter</h3>
      <p>
        Die Nutzung der Plattform ist Personen ab 18 Jahren vorbehalten. Mit der Registrierung
        bestätigst du, das Mindestalter erreicht zu haben.
      </p>

      <h2>4. Gesundheitliche Hinweise</h2>
      <p>
        Die auf Evida Life bereitgestellten Informationen, Laborauswertungen und
        Ernährungsempfehlungen dienen ausschliesslich zu Informationszwecken und ersetzen{' '}
        <strong>keine</strong> ärztliche oder ernährungsmedizinische Beratung. Bitte konsultiere
        bei gesundheitlichen Fragen oder Beschwerden stets eine Fachperson.
      </p>

      <h2>5. Inhalte und geistiges Eigentum</h2>
      <p>
        Alle von Evida Life erstellten Inhalte (Texte, Grafiken, Rezepte, Artikel) sind
        urheberrechtlich geschützt. Eine Vervielfältigung oder Weitergabe ohne ausdrückliche
        Genehmigung ist untersagt.
      </p>
      <p>
        Inhalte, die du selbst hochlädst (z. B. Laborberichte), bleiben dein Eigentum. Du
        räumst uns das Recht ein, diese ausschliesslich zur Erbringung unserer Dienste zu
        verarbeiten.
      </p>

      <h2>6. Verbotene Nutzung</h2>
      <p>Es ist untersagt, die Plattform zu nutzen, um:</p>
      <ul>
        <li>rechtswidrige Inhalte zu verbreiten</li>
        <li>andere Nutzer zu belästigen oder zu schädigen</li>
        <li>die Sicherheit oder Integrität der Plattform zu gefährden</li>
        <li>automatisierte Abfragen ohne schriftliche Genehmigung durchzuführen</li>
      </ul>

      <h2>7. Verfügbarkeit und Haftung</h2>
      <p>
        Wir sind bestrebt, die Plattform stets verfügbar zu halten, übernehmen jedoch keine
        Garantie für eine ununterbrochene Verfügbarkeit. Eine Haftung für Datenverluste oder
        Schäden durch Ausfälle ist ausgeschlossen, soweit gesetzlich zulässig.
      </p>
      <div className="placeholder">
        [Platzhalter: Vollständige Haftungsregelung gemäss schweizerischem Recht wird
        durch rechtliche Beratung ergänzt.]
      </div>

      <h2>8. Preise und Abonnements</h2>
      <div className="placeholder">
        [Platzhalter: Preismodell, Aboperioden, Kündigungsfristen und Rückerstattungsregeln
        werden vor dem Launch ergänzt.]
      </div>

      <h2>9. Kündigung</h2>
      <p>
        Du kannst dein Konto jederzeit ohne Angabe von Gründen löschen. Wir behalten uns vor,
        Konten bei schwerwiegenden Verstössen gegen diese Nutzungsbedingungen zu sperren oder
        zu löschen.
      </p>

      <h2>10. Änderungen der Bedingungen</h2>
      <p>
        Wir behalten uns vor, diese Nutzungsbedingungen anzupassen. Über wesentliche Änderungen
        informieren wir registrierte Nutzer per E-Mail mindestens 30 Tage im Voraus.
      </p>

      <h2>11. Anwendbares Recht und Gerichtsstand</h2>
      <p>
        Es gilt schweizerisches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist
        Zürich, Schweiz.
      </p>

      <h2>12. Kontakt</h2>
      <p>
        Bei Fragen zu diesen Nutzungsbedingungen erreichst du uns unter{' '}
        <a href="mailto:hello@evidalife.com">hello@evidalife.com</a>.
      </p>

    </LegalLayout>
  );
}
