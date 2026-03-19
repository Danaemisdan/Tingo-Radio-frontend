import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Settings2, Sparkles, Infinity, Radio } from 'lucide-react'
import { ReactNode } from 'react'
import Image from 'next/image'

export function Features() {
    return (
        <section className="bg-transparent py-16 md:py-32 relative z-20 w-full mt-20">
            <div className="@container mx-auto max-w-5xl px-6">
                <div className="text-center">
                    <h2 className="text-balance text-4xl font-black lg:text-5xl text-white tracking-tighter">The World's First AI Radio</h2>
                    <p className="mt-4 text-zinc-400 font-medium text-lg">Experience a fully autonomous, interactive, and personalized music journey.</p>
                </div>
                <Card className="@min-4xl:max-w-full @min-4xl:grid-cols-3 @min-4xl:divide-x @min-4xl:divide-y-0 mx-auto mt-12 grid max-w-sm divide-y overflow-hidden shadow-2xl *:text-center md:mt-20 bg-zinc-950/60 backdrop-blur-xl border-white/10 rounded-3xl">
                    <div className="group shadow-zinc-950/5 border-white/10 h-full flex flex-col hover:bg-white/5 transition-colors">
                        <CardHeader className="pb-3 flex-1 flex flex-col items-center justify-center">
                            <CardDecorator>
                                <div className="w-full h-full relative overflow-hidden rounded-full">
                                    <Image src="/grok-chat.png" alt="Chat with Ife Mi" fill className="object-cover scale-110" />
                                </div>
                            </CardDecorator>

                            <h3 className="mt-8 font-bold text-white text-xl tracking-tight">Chat with Ife Mi</h3>
                        </CardHeader>

                        <CardContent className="mt-auto">
                            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">Interact directly with our immersive AI DJ. Request tracks, ask about the current song, or just hang out with Ife Mi in real time while you vibe.</p>
                        </CardContent>
                    </div>

                    <div className="group shadow-zinc-950/5 border-white/10 h-full flex flex-col hover:bg-white/5 transition-colors">
                        <CardHeader className="pb-3 flex-1 flex flex-col items-center justify-center">
                            <CardDecorator>
                                <Infinity className="size-6 text-white" aria-hidden />
                            </CardDecorator>

                            <h3 className="mt-8 font-bold text-white text-xl tracking-tight">Endless Curation</h3>
                        </CardHeader>

                        <CardContent className="mt-auto">
                            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">Never run out of beats. Tingo dynamically generates and curates a continuous, non-stop electronic radio stream perfectly tailored to the current worldwide vibe.</p>
                        </CardContent>
                    </div>

                    <div className="group shadow-zinc-950/5 border-white/10 h-full flex flex-col hover:bg-white/5 transition-colors">
                        <CardHeader className="pb-3 flex-1 flex flex-col items-center justify-center">
                            <CardDecorator>
                                <Sparkles className="size-6 text-[#FF6B35]" aria-hidden />
                            </CardDecorator>

                            <h3 className="mt-8 font-bold text-white text-xl tracking-tight">Hyper-Personalized</h3>
                        </CardHeader>

                        <CardContent className="mt-auto">
                            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">Like, save, and share your favorite sets. The AI learns your preferences inside the Tingo ecosystem to automatically craft perfectly seamless, personalized transitions.</p>
                        </CardContent>
                    </div>
                </Card>
            </div>
        </section>
    )
}

const CardDecorator = ({ children }: { children: ReactNode }) => (
    <div aria-hidden className="relative mx-auto size-36 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]">
        <div className="absolute inset-0 [--border:rgba(255,255,255,0.1)] bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />
        <div className="bg-zinc-900 absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)] overflow-hidden p-[2px] group-hover:shadow-[0_0_25px_rgba(255,107,53,0.3)] transition-shadow duration-500">{children}</div>
    </div>
)
