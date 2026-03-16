import LegalLayout from '@/components/LegalLayout';

export const metadata = {
  title: 'Impressum – Evida Life',
};

export default function ImpressumPage() {
  return (
    <LegalLayout title="Impressum">

      <h2>Angaben gemäss Art. 3 UWG (Schweiz)</h2>

      <p>
        <strong>Evida Life AG</strong><br />
        [Strasse und Hausnummer]<br />
        [PLZ] Zürich<br />
        Schweiz
      </p>

      <p>
        <strong>E-Mail:</strong>{' '}
        <a href="mailto:hello@evidalife.com">hello@evidalife.com</a>
      </p>

      <p>
        <strong>Handelsregister:</strong> Handelsregister des Kantons Zürich<br />
        <strong>UID:</strong> CHE-[xxx.xxx.xxx]
      </p>

      <h2>Verantwortlich für den Inhalt</h2>
      <p>
        [Vorname Nachname]<br />
        Evida Life AG, Zürich
      </p>

      <h2>Haftungsausschluss</h2>
      <p>
        Die Inhalte dieser Website wurden mit grösster Sorgfalt erstellt. Für die Richtigkeit,
        Vollständigkeit und Aktualität der Inhalte übernehmen wir jedoch keine Gewähr. Die auf
        dieser Website bereitgestellten Informationen ersetzen keine ärztliche oder
        ernährungsmedizinische Beratung.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
        dem schweizerischen Urheberrecht. Beiträge Dritter sind als solche gekennzeichnet. Die
        Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung ausserhalb der
        Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung der Evida Life AG.

      </p>

      <h2>Externe Links</h2>
      <p>
        Diese Website enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen
        Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
        verantwortlich. Zum Zeitpunkt der Verlinkung waren keine Rechtsverstösse erkennbar.
      </p>

    </LegalLayout>
  );
}
