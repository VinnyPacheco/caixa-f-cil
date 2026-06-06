import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Mic, Building2, LayoutGrid, ShieldCheck, Target, Bell, CreditCard,
  BarChart3, Download, Check, X, Star, ArrowRight, Lock, Menu,
} from "lucide-react";

const navLinks = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#depoimentos", label: "Depoimentos" },
  { href: "#planos", label: "Planos" },
];

function Section({ id, className = "", children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={`py-20 md:py-28 px-5 md:px-8 ${className}`}>
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
}

function FeatureBlock({
  index, icon: Icon, eyebrow, title, body, tag, reverse,
}: {
  index: number; icon: React.ElementType; eyebrow: string;
  title: string; body: string; tag?: string; reverse?: boolean;
}) {
  return (
    <div className={`grid md:grid-cols-2 gap-8 md:gap-14 items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
      <div className="aspect-[4/3] rounded-3xl bg-gold-card border border-accent/20 shadow-soft flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent" />
        <Icon className="size-24 text-accent relative z-10" strokeWidth={1.2} />
      </div>
      <div>
        <div className="text-xs uppercase tracking-widest text-accent font-bold mb-3">
          {String(index).padStart(2, "0")} · {eyebrow}
        </div>
        <h3 className="font-display text-3xl md:text-4xl text-foreground mb-4 leading-tight">{title}</h3>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">{body}</p>
        {tag && (
          <span className="inline-block bg-accent/10 text-accent text-sm font-semibold px-3 py-1.5 rounded-full border border-accent/20">
            {tag}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goSignup = () => navigate("/auth?signup=1");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAVBAR */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all ${
          scrolled ? "bg-background/90 backdrop-blur border-b border-border shadow-soft" : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl font-bold text-primary tracking-tight">
            FinLar
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-foreground/80 hover:text-accent transition-colors">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button onClick={goSignup} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 hidden sm:inline-flex">
              Experimentar grátis — 21 dias
            </Button>
            <Button onClick={goSignup} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full sm:hidden">
              Começar grátis
            </Button>
            <button
              className="md:hidden p-2 text-foreground"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <nav className="flex flex-col p-4 gap-3">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-sm text-foreground py-2"
                  onClick={() => setMobileOpen(false)}
                >
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="pt-32 md:pt-40 pb-20 px-5 md:px-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="animate-fade-in">
            <div className="text-xs uppercase tracking-widest text-accent font-bold mb-5">
              O app de finanças que sua família estava esperando
            </div>
            <h1 className="font-display text-4xl md:text-6xl leading-[1.05] text-foreground mb-6">
              E se você soubesse exatamente <em className="text-accent not-italic">quando</em> vai realizar o sonho da sua família?
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-5">
              A viagem que vocês planejam há anos. A reforma que fica para depois. A reserva que nunca cresce. O Finlar não só controla onde seu dinheiro foi — ele te mostra o caminho para onde ele pode ir.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed mb-8">
              Com lançamento por voz em 1 clique, importação automática do seu banco e um programa completo de Metas, o Finlar transforma o controle financeiro na ferramenta mais poderosa que sua família já teve.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <Button onClick={goSignup} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 h-12 text-base">
                Quero realizar os sonhos da minha família <ArrowRight className="size-4" />
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-6 h-12 text-base border-primary/30 text-primary hover:bg-primary/5">
                <a href="#como-funciona">Ver como funciona</a>
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Check className="size-4 text-success" /> Sem cartão de crédito</span>
              <span className="inline-flex items-center gap-1.5"><Check className="size-4 text-success" /> 21 dias grátis</span>
              <span className="inline-flex items-center gap-1.5"><Check className="size-4 text-success" /> Acesso completo</span>
            </div>
          </div>

          {/* Device mockup */}
          <div className="relative animate-fade-in">
            <div className="relative mx-auto w-full max-w-sm aspect-[9/16] rounded-[2.5rem] bg-primary p-3 shadow-2xl">
              <div className="w-full h-full rounded-[2rem] bg-background overflow-hidden flex flex-col">
                <div className="bg-gold-card px-5 py-4 border-b border-border">
                  <div className="text-xs text-muted-foreground">Saldo atual</div>
                  <div className="font-display text-2xl text-foreground">R$ 8.420,75</div>
                </div>
                <div className="p-4 space-y-2 flex-1 overflow-hidden">
                  {[
                    { t: "Mercado Pão de Açúcar", v: "-247,30", c: "Alimentação" },
                    { t: "Salário", v: "+5.800,00", c: "Receita", pos: true },
                    { t: "Conta de luz", v: "-189,45", c: "Casa" },
                    { t: "Meta: Viagem família", v: "+400,00", c: "Objetivo", pos: true },
                    { t: "Posto Shell", v: "-180,00", c: "Transporte" },
                    { t: "Netflix", v: "-39,90", c: "Assinaturas" },
                  ].map((tx, i) => (
                    <div key={i} className="flex items-center justify-between bg-card border border-border/60 rounded-xl px-3 py-2">
                      <div>
                        <div className="text-xs font-semibold text-foreground">{tx.t}</div>
                        <div className="text-[10px] text-muted-foreground">{tx.c}</div>
                      </div>
                      <div className={`text-xs font-bold ${tx.pos ? "text-success" : "text-destructive"}`}>
                        R$ {tx.v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-accent text-accent-foreground rounded-full p-3 shadow-lg rotate-12">
              <Mic className="size-5" />
            </div>
          </div>
        </div>
      </section>

      {/* IMPACT BAR */}
      <div className="bg-gold-card border-y border-border">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-6 grid grid-cols-2 md:grid-cols-5 gap-6">
          {[
            { icon: "🎙️", t: "1 clique", s: "Lançamento por voz" },
            { icon: "🏦", t: "4+ bancos", s: "Importação automática" },
            { icon: "📊", t: "3 meses", s: "Na mesma tela" },
            { icon: "🛡️", t: "Modo Simulador", s: "Planeje sem risco" },
            { icon: "🎯", t: "Metas", s: "Gastos e objetivos" },
          ].map((i) => (
            <div key={i.t} className="text-center">
              <div className="text-2xl mb-1">{i.icon}</div>
              <div className="font-display font-bold text-foreground text-sm md:text-base">{i.t}</div>
              <div className="text-xs text-muted-foreground">{i.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PAIN WITH DATA */}
      <Section>
        <h2 className="font-display text-3xl md:text-5xl text-center text-foreground mb-4 leading-tight">
          O problema que toda família conhece — <span className="text-accent">mas poucos resolvem</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {[
            { stat: "73%", desc: "das brigas de casal têm o dinheiro como causa principal", source: "SPC Brasil" },
            { stat: "R$ 347/mês", desc: "É quanto a família brasileira média perde em gastos invisíveis por falta de controle", source: "Serasa" },
            { stat: "1 em cada 3", desc: "famílias brasileiras não sabe quanto gasta por mês", source: "IBGE" },
          ].map((c) => (
            <Card key={c.source} className="p-7 rounded-3xl border-border bg-card shadow-soft">
              <div className="font-display text-4xl md:text-5xl text-primary mb-3">{c.stat}</div>
              <p className="text-foreground leading-snug mb-4">{c.desc}</p>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Fonte: {c.source}</div>
            </Card>
          ))}
        </div>
        <p className="text-center text-lg md:text-xl font-display italic text-foreground mt-10 max-w-2xl mx-auto">
          Não é falta de dinheiro. É falta de <span className="text-accent not-italic font-bold">clareza</span> e de um <span className="text-accent not-italic font-bold">plano</span>. O Finlar resolve os dois.
        </p>
      </Section>

      {/* FEATURES */}
      <Section id="como-funciona" className="bg-gold-card/40">
        <h2 className="font-display text-3xl md:text-5xl text-center text-foreground mb-3 leading-tight">
          Tudo que sua família precisa. <span className="text-accent">Nada que complica.</span>
        </h2>
        <p className="text-center text-muted-foreground text-lg max-w-2xl mx-auto mb-16">
          Cada funcionalidade do Finlar foi criada para uma família real — não para um contador.
        </p>
        <div id="funcionalidades" className="space-y-20">
          <FeatureBlock index={1} icon={Target} eyebrow="Programa de Metas"
            title="Seus sonhos merecem uma data. O Finlar coloca uma."
            body="Crie metas de dois tipos: Metas de Gasto (controlar quanto você quer gastar em uma categoria) e Metas de Objetivo (juntar dinheiro para algo que a família quer conquistar — viagem, reserva de emergência, troca de carro, reforma). O Finlar acompanha o progresso automaticamente e te mostra, mês a mês, se você está no caminho certo. É a diferença entre sonhar e planejar."
            tag="🎯 Controle + Conquista" />
          <FeatureBlock index={2} icon={Mic} eyebrow="Voz" reverse
            title="Gastou? Lança em 1 segundo — por voz."
            body="Acabou de pagar no mercado? Sem abrir planilha, sem digitar nada. Fale com o Finlar e a transação é registrada na hora. É o jeito mais rápido que existe de manter o controle financeiro sem abandonar no segundo mês."
            tag="Único no mercado" />
          <FeatureBlock index={3} icon={Download} eyebrow="Importação inteligente"
            title="Conecte seu banco. O Finlar faz o resto."
            body="Importe seu extrato do Itaú, Nubank, Mercado Pago e outros com um arquivo. O Finlar reconhece automaticamente lançamentos já incluídos para não duplicar, e sugere a categoria certa baseado no seu histórico. Zero retrabalho."
            tag="Reconhecimento inteligente" />
          <FeatureBlock index={4} icon={ShieldCheck} eyebrow="Modo Simulador" reverse
            title="Planeje o futuro sem mexer no presente."
            body="Quer ver o que acontece se você cortar o delivery? Se antecipar uma parcela? Se fizer aquela reforma em março? No Modo Simulador você testa qualquer cenário financeiro sem alterar um único dado real. É como ter uma máquina do tempo para suas finanças."
            tag="Exclusivo Finlar" />
          <FeatureBlock index={5} icon={LayoutGrid} eyebrow="3 meses paralelos"
            title="Veja 3 meses ao mesmo tempo — e entenda seus padrões."
            body="O Finlar exibe três meses lado a lado na mesma tela, com o saldo atualizado a cada lançamento. Você enxerga padrões que antes eram invisíveis e toma decisões com muito mais contexto."
            tag="Visão única no mercado" />
          <FeatureBlock index={6} icon={Bell} eyebrow="Alertas" reverse
            title="Nunca mais pague juros por esquecer uma conta."
            body="O Finlar avisa quando uma transação está próxima de vencer ou já venceu. Chega de juros desnecessários por boleto atrasado." />
          <FeatureBlock index={7} icon={CreditCard} eyebrow="Parcelamentos"
            title="Parcelou? O Finlar acompanha até a última parcela."
            body="Cadastre uma compra parcelada uma única vez. O Finlar registra todas as parcelas, organiza por Tags e dá baixa automaticamente conforme os meses passam." />
          <FeatureBlock index={8} icon={BarChart3} eyebrow="Dashboard" reverse
            title="Relatórios que você realmente entende."
            body="Compare meses, filtre por categorias e tags, veja para onde o dinheiro foi e exporte relatórios completos. É a visão executiva das finanças da sua família — sem precisar de contador." />
        </div>
      </Section>

      {/* WHO IT'S FOR */}
      <Section>
        <h2 className="font-display text-3xl md:text-5xl text-center text-foreground mb-12 leading-tight">
          O Finlar é para você se...
        </h2>
        <div className="grid md:grid-cols-3 gap-4 md:gap-5">
          {[
            "Você tem família e quer parar de terminar o mês sem saber para onde foi o dinheiro",
            "Você tem um sonho — viagem, reforma, reserva — e quer saber quando vai conseguir realizar",
            "Você e seu cônjuge já discutiram por causa de dinheiro e querem mudar isso",
            "Você tenta controlar as finanças mas abandona a planilha sempre no segundo mês",
            "Você usa Nubank, Itaú ou Mercado Pago e quer tudo centralizado em um lugar",
            "Você quer uma solução que funcione de verdade, não mais um app que vai desinstalar em 3 dias",
          ].map((t) => (
            <div key={t} className="flex items-start gap-3 bg-card border border-border rounded-2xl p-5 shadow-soft">
              <div className="size-7 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0 mt-0.5">
                <Check className="size-4" />
              </div>
              <p className="text-foreground leading-snug text-sm md:text-base">{t}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section id="depoimentos" className="bg-gold-card/40">
        <h2 className="font-display text-3xl md:text-5xl text-center text-foreground mb-12 leading-tight">
          Famílias reais. <span className="text-accent">Sonhos realizados.</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { q: "Criamos uma meta de viagem no Finlar em janeiro. Em julho, viajamos para a praia com a família pela primeira vez em 4 anos. O app mostrou exatamente quanto poupar por mês para chegar lá. Nunca imaginei que seria tão simples.",
              n: "Ana Paula S.", c: "São Paulo", t: "assinante há 6 meses" },
            { q: "O lançamento por voz mudou completamente minha consistência. Antes eu anotava no papel e esquecia. Agora falo direto pro app no estacionamento e pronto. Nunca fui tão disciplinado com dinheiro na vida.",
              n: "Marcos R.", c: "Curitiba", t: "assinante há 5 meses" },
            { q: "Usei o Modo Simulador para ver se conseguia cortar R$400 do orçamento sem prejudicar a qualidade de vida. Consegui — e esse dinheiro virou nossa reserva de emergência. Em 5 meses, juntamos R$2.000.",
              n: "Camila e Pedro T.", c: "BH", t: "assinantes há 5 meses" },
          ].map((d) => (
            <Card key={d.n} className="p-7 rounded-3xl bg-card border-border shadow-soft flex flex-col">
              <div className="flex gap-0.5 text-accent mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="size-4 fill-current" />)}
              </div>
              <p className="text-foreground leading-relaxed mb-5 flex-1">"{d.q}"</p>
              <div className="text-sm">
                <div className="font-bold text-foreground">{d.n}</div>
                <div className="text-muted-foreground">{d.c} — {d.t}</div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* WITH vs WITHOUT */}
      <Section>
        <h2 className="font-display text-3xl md:text-5xl text-center text-foreground mb-12 leading-tight">
          O que muda quando você tem o Finlar
        </h2>
        <div className="grid md:grid-cols-2 gap-5">
          <Card className="p-7 rounded-3xl bg-card border-border shadow-soft">
            <h3 className="font-display text-2xl text-muted-foreground mb-5">Sem o Finlar</h3>
            <ul className="space-y-3">
              {[
                "Fim do mês chegando e o dinheiro já foi",
                "Sonhos adiados porque \"nunca sobra nada\"",
                "Parcelas perdidas gerando juros desnecessários",
                "Brigas por dinheiro sem dados para embasar a conversa",
                "Decisões financeiras tomadas no escuro",
                "Planilha abandonada no segundo mês",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-muted-foreground">
                  <X className="size-5 text-destructive shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-7 rounded-3xl bg-primary text-primary-foreground border-primary shadow-lg">
            <h3 className="font-display text-2xl mb-5">Com o Finlar</h3>
            <ul className="space-y-3">
              {[
                "Clareza total sobre cada real que entra e sai",
                "Metas com progresso visível e datas para realizar",
                "Parcelas acompanhadas automaticamente até o fim",
                "Conversas sobre dinheiro com dados na tela",
                "Decisões tomadas com contexto e confiança",
                "Controle que você realmente consegue manter",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <Check className="size-5 text-accent-gold-light shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <p className="text-center font-display text-xl md:text-2xl text-foreground mt-12 max-w-2xl mx-auto">
          R$ 19,90/mês. <span className="text-muted-foreground">Menos que um jantar fora.</span><br />
          <span className="text-accent">Mais do que qualquer planilha vai te entregar.</span>
        </p>
      </Section>

      {/* PLANS */}
      <Section id="planos" className="bg-gold-card/40">
        <h2 className="font-display text-3xl md:text-5xl text-center text-foreground mb-12 leading-tight">
          Comece grátis. <span className="text-accent">Continue porque vale.</span>
        </h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Card className="p-7 rounded-3xl bg-card border-border shadow-soft">
            <div className="text-sm uppercase tracking-wider text-muted-foreground font-bold mb-2">Pro Mensal</div>
            <div className="font-display text-5xl text-primary mb-1">R$ 19,90<span className="text-lg text-muted-foreground">/mês</span></div>
            <div className="text-sm text-muted-foreground mb-6">Menos que R$ 0,67 por dia</div>
            <Button onClick={goSignup} variant="outline" className="w-full rounded-full border-primary text-primary hover:bg-primary/5">
              Começar trial grátis
            </Button>
          </Card>
          <Card className="p-7 rounded-3xl bg-card border-2 border-accent shadow-gold relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full">
              Mais escolhido
            </div>
            <div className="text-sm uppercase tracking-wider text-accent font-bold mb-2">Pro Anual</div>
            <div className="font-display text-5xl text-primary mb-1">R$ 159<span className="text-lg text-muted-foreground">/ano</span></div>
            <div className="text-sm text-success font-semibold mb-6">Você economiza R$ 80</div>
            <Button onClick={goSignup} className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              Começar trial grátis
            </Button>
          </Card>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8 inline-flex items-center gap-2 justify-center w-full">
          <Lock className="size-4" /> Pagamento seguro via Stripe. Seus dados bancários nunca passam pelo Finlar.
        </p>
      </Section>

      {/* GUARANTEE */}
      <Section>
        <Card className="p-8 md:p-12 rounded-3xl border-2 border-accent/40 bg-gold-card/60 shadow-soft max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-5">
            <div className="size-14 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center">
              <ShieldCheck className="size-7" />
            </div>
            <h2 className="font-display text-2xl md:text-3xl text-foreground">21 dias grátis. Sem cartão. Sem risco.</h2>
          </div>
          <p className="text-foreground leading-relaxed mb-6">
            Você não precisa decidir nada agora. Crie sua conta, use o Finlar por 21 dias com acesso completo — incluindo o programa de Metas, o Modo Simulador e a importação bancária — e aí sim decida se vale para a sua família. Se não valer, não paga nada.
          </p>
          <ul className="space-y-3">
            {[
              "21 dias de acesso completo sem cartão de crédito",
              "Cancele online quando quiser, sem ligar para ninguém",
              "Seus dados ficam salvos por 30 dias após o cancelamento",
              "Suporte direto com a equipe Finlar — respondemos em até 24h",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 text-foreground">
                <Check className="size-5 text-success shrink-0 mt-0.5" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      {/* FINAL CTA */}
      <section className="px-5 md:px-8 py-20 md:py-28">
        <div className="max-w-4xl mx-auto bg-primary text-primary-foreground rounded-3xl p-10 md:p-16 text-center shadow-2xl">
          <h2 className="font-display text-3xl md:text-5xl leading-tight mb-5">
            Sua família tem sonhos. <br className="hidden md:block" />
            <span className="text-accent-gold-light">O Finlar ajuda a realizar.</span>
          </h2>
          <p className="text-primary-foreground/80 text-lg leading-relaxed max-w-2xl mx-auto mb-8">
            Não porque você vai ganhar mais — mas porque você vai saber exatamente o que fazer com o que já tem. Esse é o tipo de família que você quer ser.
          </p>
          <Button
            onClick={goSignup}
            size="lg"
            className="bg-background text-primary hover:bg-background/90 rounded-full px-8 h-14 text-base md:text-lg font-bold shadow-xl"
          >
            Sim — quero experimentar o Finlar grátis por 21 dias <ArrowRight className="size-5" />
          </Button>
          <p className="text-primary-foreground/70 text-sm mt-5">
            Sem cartão de crédito. Sem compromisso. Acesso completo desde o primeiro dia.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 flex flex-col md:flex-row items-center md:justify-between gap-5 text-center md:text-left">
          <Link to="/" className="font-display text-xl font-bold text-primary">FinLar</Link>
          <div className="flex flex-wrap gap-5 text-sm text-muted-foreground justify-center">
            <a href="#" className="hover:text-accent">Privacidade</a>
            <a href="#" className="hover:text-accent">Termos de uso</a>
            <a href="#" className="hover:text-accent">Contato</a>
          </div>
          <div className="text-xs text-muted-foreground">© 2025 Finlar. Todos os direitos reservados.</div>
        </div>
      </footer>
    </div>
  );
}