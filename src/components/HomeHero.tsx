import React, { type ReactNode } from 'react';

/** Shared by the live page and its first HTML paint. No browser-only dependencies. */
export function HomeHero({ lang = 'sv', children }: { lang?: 'sv' | 'en'; children?: ReactNode }) {
  const text = (sv: string, en: string) => lang === 'en' ? en : sv;
  return (
        <section className="home-hero" aria-labelledby="home-title">
          <img className="home-hero-image" src="/images/home/hero-1600.avif" srcSet="/images/home/hero-640.avif 640w, /images/home/hero-960.avif 960w, /images/home/hero-1600.avif 1600w, /images/home/hero-1920.avif 1920w" sizes="100vw" width="1600" height="1067" alt={text('Händer som skruvar på en cykel i en cykelverkstad', 'Hands repairing a bike in a workshop')} {...{ fetchpriority: 'high' }} />
          <div className="home-container home-hero-content">
            <div className="home-hero-copy">
              <p className="home-eyebrow">{text('Cykelhjälpen · Din cykel, ditt val', 'Cykelhjälpen · Your bike, your choice')}</p>
              <h1 id="home-title">{text('Cykeln krånglar? Fråga tre verkstäder på en gång.', 'Bike playing up? Ask three workshops at once.')}</h1>
              <p className="home-hero-intro">{text('Skriv vad som är fel, så svarar verkstäder i närheten med pris och när de kan ta emot cykeln. Gratis för dig. Finns i Linköping, Norrköping, Uppsala och Lund.', 'Tell us what is wrong. Nearby workshops reply with a price and when they can take your bike. Free for you. Available in Linköping, Norrköping, Uppsala and Lund.')}</p>
              {children ?? (<a className="home-button" href={lang === 'en' ? '/en/submit-request' : '/skicka-arende'}>{text('Beskriv felet', 'Describe the problem')} <span aria-hidden="true">↗</span></a>)}
              <ul className="home-facts">
                <li>{text('Kostar ingenting', 'Costs nothing')}</li><li>{text('Högst tre svar', 'Up to three replies')}</li><li>{text('Du bestämmer själv', 'You decide')}</li>
              </ul>
            </div>
          </div>
        </section>
  );
}
