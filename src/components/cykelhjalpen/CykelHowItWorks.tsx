import { Heart, MessageSquare, Wrench } from 'lucide-react'

const CykelHowItWorks = () => (
  <section id="sa-fungerar-det" className="py-20 bg-background/60 scroll-mt-20">
    <div className="container mx-auto px-4 max-w-6xl">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3">Så fungerar det</p>
        <h2 className="font-display text-4xl md:text-5xl">Från cykelproblem till rätt verkstad i tre steg</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {[
          { icon: Wrench, title: 'Beskriv cykeln', text: 'Välj cykeltyp och problem. Berätta var i Linköping du finns och lägg gärna till bilder.' },
          { icon: MessageSquare, title: 'Ta emot prisförslag', text: 'Godkända verkstäder i Linköping kan svara med pris, möjlig tid och kontaktuppgifter.' },
          { icon: Heart, title: 'Välj helt fritt', text: 'Jämför alternativen och kontakta den verkstad som passar dig bäst. Det finns ingen köpplikt.' },
        ].map(({ icon: Icon, title, text }, index) => (
          <div key={title} className="sticker bg-card rounded-3xl p-7 border-2 border-foreground">
            <div className="flex items-center justify-between mb-5">
              <span className="font-mono text-sm text-muted-foreground">0{index + 1}</span>
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display text-2xl mb-2">{title}</h3>
            <p className="text-muted-foreground leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default CykelHowItWorks
