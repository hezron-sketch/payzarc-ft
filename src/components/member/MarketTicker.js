import React, { useEffect, useMemo, useState } from "react";
import { countries } from "../../utility/countries";
import { getRate } from "./shared";

// Floating market ticker — sits to the right, follows scroll, and stops
// just above the footer instead of covering it. On mobile it also has to
// clear the fixed bottom nav bar (70px + safe-area), added as a CSS var so
// the JS scroll-tracking below only has to know about the footer, not the
// nav.
function MarketTicker({ myCountry, senderCurrency, liveRates }) {
  const [tickerIndex, setTickerIndex] = useState(0);
  const [tickerBottom, setTickerBottom] = useState(24);

  // Rotate the ticker message every few seconds.
  useEffect(() => {
    const id = setInterval(() => setTickerIndex((i) => i + 1), 4000);
    return () => clearInterval(id);
  }, []);

  // Keep the ticker "fixed" to the viewport while scrolling, but push it up
  // by however much the footer has crept into view so it stops right at the
  // footer's top edge instead of covering it.
  useEffect(() => {
    const REST_GAP = 24;
    const handleScroll = () => {
      const footer = document.querySelector("footer");
      if (!footer) {
        setTickerBottom(REST_GAP);
        return;
      }
      const overlap = window.innerHeight - footer.getBoundingClientRect().top;
      setTickerBottom(overlap > 0 ? REST_GAP + overlap : REST_GAP);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  // A fresh random country (never mine) picked on every ticker rotation —
  // re-rolled whenever tickerIndex changes, so each turn quotes a different
  // country's rate rather than sticking to one for the whole session.
  const tickerCountry = useMemo(() => {
    const pool = countries.filter((c) => c.name !== myCountry?.name);
    return pool[Math.floor(Math.random() * pool.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerIndex, myCountry?.name]);

  const tickerCountryRate = getRate(
    liveRates,
    senderCurrency,
    tickerCountry?.currency,
  );

  // Strictly alternates between a random country's rate and Terms & Conditions.
  const tickerMessages = [
    tickerCountry && tickerCountryRate
      ? `1 ${senderCurrency} = ${tickerCountryRate} ${tickerCountry.currency} (${tickerCountry.name})`
      : null,
    "Read Our Terms & Conditions",
  ].filter(Boolean);

  return (
    <button
      type="button"
      className="hidden sm:block fixed right-8 z-50 max-w-[260px] bg-card/90 [backdrop-filter:blur(14px)_saturate(1.3)] [-webkit-backdrop-filter:blur(14px)_saturate(1.3)] border border-[var(--gold-border)] text-gold text-[0.8rem] font-semibold leading-[1.4] text-left px-[1.1rem] py-2 rounded-2xl cursor-pointer transition-[transform,bottom] duration-150 hover:-translate-y-0.5 max-[768px]:right-4 max-[768px]:max-w-[190px] max-[768px]:text-[0.72rem] max-[768px]:px-[0.9rem] max-[768px]:py-[0.45rem] max-[768px]:bg-card/75 max-[768px]:[backdrop-filter:blur(28px)_saturate(1.6)] max-[768px]:[-webkit-backdrop-filter:blur(28px)_saturate(1.6)] max-[768px]:[--mobile-nav-clearance:calc(70px+env(safe-area-inset-bottom)+12px)]"
      style={{
        bottom: `calc(${tickerBottom}px + var(--mobile-nav-clearance, 0px))`,
      }}
      onClick={() => setTickerIndex((i) => i + 1)}
    >
      <span key={tickerIndex} className="block animate-ticker-fade">
        {tickerMessages[tickerIndex % tickerMessages.length]}
      </span>
    </button>
  );
}

export default MarketTicker;
