import { useEffect, useRef, useState } from 'react'
import './App.css'
import BurnPhoto from './BurnPhoto.jsx'
import nanda from './img/nanda-tsunami.jpg'
import tasha from './img/tasha-tracie.jpg'
import ebony from './img/ebony.jpg'
import djonga from './img/djonga.jpg'
import alee from './img/alee.jpg'

// Textos de exemplo: troque pelos dados reais do evento
const EVENT = {
  day: 'Sexta-feira, 26/02',
  time: '20h',
  place: 'Vibra São Paulo',
}

const LINEUP = [
  { name: 'Nanda Tsunami', img: nanda },
  { name: 'Tasha Tracie', img: tasha },
  { name: 'Ebony', img: ebony },
  { name: 'Djonga', img: djonga },
  { name: 'Alee', img: alee },
]

const PHRASE = ['o rap é preto', 'o pop é preto', 'o house é preto', 'o rock é preto']

const SCHEDULE = [
  { time: '14h', title: 'Abertura e feira de criadores' },
  { time: '16h', title: 'Desfile 1: coleções autorais' },
  { time: '18h', title: 'Roda de conversa com estilistas' },
  { time: '20h', title: 'Desfile final e show' },
]

const TICKETS = [
  { name: 'Meia', price: 'R$ 20', note: 'Estudantes e moradores da região.' },
  { name: 'Inteira', price: 'R$ 40', note: 'Acesso a todo o evento.' },
  { name: 'Apoiador', price: 'R$ 65', note: 'Ajude a manter o Perifar vivo.' },
]

function App() {
  const phraseRef = useRef(null)
  const [past, setPast] = useState(false)

  useEffect(() => {
    // F5 sempre volta para a primeira tela
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
    window.scrollTo({ top: 0, behavior: 'instant' })
    
    let raf = 0
    const update = () => {
      raf = 0
      // na primeira tela a frase do fundo fica desfocada e vai ficando nítida ao rolar
      const p = Math.min(1, window.scrollY / (window.innerHeight * 0.7))
      if (phraseRef.current) {
        phraseRef.current.style.filter = p >= 1 ? 'none' : `blur(${((1 - p) * 18).toFixed(1)}px)`
      }
      // o menu só aparece depois que a primeira tela sai de vista
      setPast(window.scrollY > window.innerHeight * 0.5)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <>
      {/* Frase fixa no fundo: continua visível enquanto a página rola */}
      <div className="bg-phrase" ref={phraseRef}>
        {PHRASE.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <div className="page">
        <header className={`header ${past ? 'is-visible' : ''}`}>
          <a href="#topo" className="brand">
            Perifar
          </a>
          <nav className="nav" aria-label="Principal">
            <a href="#lineup">Line-up</a>
            <a href="#sobre">Sobre</a>
            <a href="#programacao">Programação</a>
            <a href="#ingressos" className="btn btn-small">
              Ingressos
            </a>
          </nav>
        </header>

        <main id="topo">
          <section className="intro">
            <h1 className="hero-logo">Perifar</h1>
            <p className="hero-kicker">Show off</p>
            <a href="#lineup" className="scroll-down" aria-label="Rolar para o line-up">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 9l7 7 7-7" />
              </svg>
            </a>
          </section>

          <section id="lineup" className="hero">
            <ul className="lineup" aria-label="Line-up">
              {LINEUP.map((artist) => (
                <li key={artist.name} className="artist">
                  <BurnPhoto src={artist.img} alt={artist.name} />
                  <span className="artist-name">{artist.name}</span>
                </li>
              ))}
            </ul>

            <ul className="hero-info" aria-label="Informações do evento">
              <li>{EVENT.day}</li>
              <li>{EVENT.time}</li>
              <li>{EVENT.place}</li>
            </ul>

            <a href="#ingressos" className="btn">
              Garantir ingresso
            </a>
          </section>

          <section id="sobre" className="section">
            <h2>Sobre o evento</h2>
            <div className="panel">
              <p>
                O Perifar reúne criadores, modelos e público para mostrar a moda que nasce
                fora do centro. Cada peça conta de onde veio: do bairro, da costura de
                casa, do brechó e da rua.
              </p>
            </div>
          </section>

          <section id="programacao" className="section">
            <h2>Programação</h2>
            <ol className="schedule">
              {SCHEDULE.map((item) => (
                <li key={item.time} className="slot">
                  <span className="slot-time">{item.time}</span>
                  <span>{item.title}</span>
                </li>
              ))}
            </ol>
          </section>

          <section id="ingressos" className="section">
            <h2>Ingressos</h2>
            <ul className="tickets">
              {TICKETS.map((t) => (
                <li key={t.name} className="ticket">
                  <h3>{t.name}</h3>
                  <p className="ticket-price">{t.price}</p>
                  <p>{t.note}</p>
                  <button className="btn">Comprar {t.name.toLowerCase()}</button>
                </li>
              ))}
            </ul>
          </section>
        </main>

        <footer className="footer">
          <p className="brand">Perifar</p>
          <p>
            {EVENT.day} · {EVENT.time} · {EVENT.place}
          </p>
          <p>contato@perifar.com.br</p>
          <p className="copyright">&copy; 2026 Perifar. Todos os direitos reservados.</p>
        </footer>
      </div>
    </>
  )
}

export default App
