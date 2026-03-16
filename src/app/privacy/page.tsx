import LegalLayout from '@/components/LegalLayout';

export const metadata = {
  title: 'Datenschutzerklärung – Evida Life',
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Datenschutzerklärung"
      subtitle="Wie wir mit deinen Daten umgehen"
      lastUpdated="März 2026"
    >

      <h2>1. Verantwortlicher</h2>
      <p>
        Verantwortlicher im Sinne der DSGVO und des schweizerischen Datenschutzgesetzes (nDSG) ist:
      </p>
      <p>
        <strong>Evida Life AG</strong><br />
        [Adresse], Zürich, Schweiz<br />
        E-Mail: <a href="mailto:datenschutz@evidalife.com">datenschutz@evidalife.com</a>
      </p>

      <h2>2. Welche Daten wir erheben</h2>

      <h3>Warteschliste (Waitlist)</h3>
      <p>
        Wenn du dich auf unserer Warteliste einträgst, speichern wir deine E-Mail-Adresse, um dich
        über den Launch der Plattform zu informieren. Die Speicherung erfolgt auf Basis deiner
        Einwilligung (Art. 6 Abs. 1 lit. a DSGVO / Art. 31 nDSG).
      </p>

      <h3>Nutzerkonto</h3>
      <p>
        Bei der Registrierung erheben wir deine E-Mail-Adresse und ein Passwort. Weitere
        Profilangaben (z. B. Name, Geburtsdatum) kannst du freiwillig ergänzen. Rechtsgrundlage ist
        die Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).
      </p>

      <h3>Gesundheitsdaten</h3>
      <div className="placeholder">
        [Platzhalter: Beschreibung der Laborwerte, Biomarker und Daily-Dozen-Daten, die Nutzer
        hochladen oder eingeben können. Rechtsgrundlage: ausdrückliche Einwilligung gemäss
        Art. 9 Abs. 2 lit. a DSGVO.]
      </div>

      <h3>Automatisch erhobene Daten</h3>
      <p>
        Beim Besuch unserer Website werden technisch notwendige Daten (IP-Adresse, Browser,
        Referrer) für einen sehr kurzen Zeitraum in Server-Logs gespeichert. Diese Daten werden
        nicht mit anderen Daten zusammengeführt.
      </p>

      <h2>3. Analytics (Plausible)</h2>
      <p>
        Wir verwenden{' '}
        <a href="https://plausible.io" target="_blank" rel="noopener noreferrer">
          Plausible Analytics
        </a>
        , eine datenschutzfreundliche, cookielose Analyse-Lösung mit Sitz in der EU. Plausible
        setzt keine Cookies, speichert keine personenbezogenen Daten und ist vollständig
        DSGVO-konform. Es werden keine Daten an Dritte weitergegeben.
      </p>

      <h2>4. Datenspeicherung (Supabase)</h2>
      <p>
        Deine Daten werden in der Infrastruktur von{' '}
        <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
          Supabase
        </a>{' '}
        gespeichert. Unser Datenbankserver befindet sich in der Region <strong>EU (Zürich)</strong>.
        Supabase verarbeitet Daten gemäss seinen{' '}
        <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
          Datenschutzbestimmungen
        </a>{' '}
        und agiert als Auftragsverarbeiter.
      </p>

      <h2>5. Cookies</h2>
      <p>
        Diese Website verwendet keine Marketing- oder Tracking-Cookies. Wir setzen ausschliesslich
        technisch notwendige Cookies für die Authentifizierung (Session-Cookies), die nach dem
        Abmelden gelöscht werden.
      </p>

      <h2>6. Deine Rechte</h2>
      <p>Du hast das Recht auf:</p>
      <ul>
        <li>Auskunft über deine gespeicherten Daten (Art. 15 DSGVO / Art. 25 nDSG)</li>
        <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
        <li>Löschung deiner Daten (Art. 17 DSGVO / Art. 32 nDSG)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerruf einer Einwilligung jederzeit ohne Angabe von Gründen</li>
        <li>Beschwerde bei einer Aufsichtsbehörde (EDÖB, Schweiz)</li>
      </ul>
      <p>
        Anfragen richtest du an:{' '}
        <a href="mailto:datenschutz@evidalife.com">datenschutz@evidalife.com</a>
      </p>

      <h2>7. Drittanbieter und Weitergabe</h2>
      <div className="placeholder">
        [Platzhalter: Partnerlabore, Zahlungsanbieter und weitere Auftragsverarbeiter werden hier
        aufgeführt, sobald entsprechende Partnerschaften bestehen.]
      </div>

      <h2>8. Änderungen dieser Erklärung</h2>
      <p>
        Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen. Die aktuelle
        Version ist stets auf dieser Seite abrufbar. Bei wesentlichen Änderungen werden registrierte
        Nutzer per E-Mail informiert.
      </p>

      <h2>9. Kontakt</h2>
      <p>
        Bei Fragen zum Datenschutz erreichst du uns unter{' '}
        <a href="mailto:datenschutz@evidalife.com">datenschutz@evidalife.com</a>.
      </p>

    </LegalLayout>
  );
}
