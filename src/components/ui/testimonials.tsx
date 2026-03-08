import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ExternalLink, Newspaper } from 'lucide-react'
import Image from 'next/image'

export default function Testimonials() {
    return (
        <section className="py-24 md:py-32 bg-black relative z-10">
            <div className="mx-auto max-w-7xl space-y-12 px-6">
                <div className="relative z-10 mx-auto max-w-2xl space-y-4 text-center flex flex-col items-center">
                    <h2 className="text-3xl font-black lg:text-5xl text-white tracking-tight flex items-center justify-center gap-4">
                        <Image src="/tingo_logo_minimal.svg" alt="Tingo" width={140} height={40} className="object-contain" />
                        in the Press
                    </h2>
                    <p className="text-zinc-400 font-medium text-lg mt-4 w-full">The world is tuning in to the future of broadcasting. See what leading publications are saying about our platform.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                    {/* Article 1 */}
                    <a href="https://guardian.ng/news/tingo-ai-radio-the-first-ai-radio-in-africa/" target="_blank" rel="noopener noreferrer" className="block group">
                        <Card className="h-full bg-zinc-950/50 border-white/10 hover:bg-white/5 transition-colors cursor-pointer rounded-2xl">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between text-zinc-500 group-hover:text-[#FF6B35] transition-colors">
                                    <h3 className="font-bold text-white text-lg tracking-tight">The Guardian Nigeria</h3>
                                    <ExternalLink className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <blockquote className="space-y-4">
                                    <p className="text-zinc-300 font-medium leading-relaxed group-hover:text-white transition-colors">
                                        "Tingo AI Radio: The First AI Radio in Africa"
                                    </p>
                                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-zinc-600">
                                        <Newspaper className="h-3 w-3" /> Press Release
                                    </div>
                                </blockquote>
                            </CardContent>
                        </Card>
                    </a>

                    {/* Article 2 */}
                    <a href="https://news.broadcastmediaafrica.com/2025/02/17/tingo-ai-radio-102-5-fm-africas-revolutionary-ai-powered-radio-station-launches-in-nigeria/" target="_blank" rel="noopener noreferrer" className="block group">
                        <Card className="h-full bg-zinc-950/50 border-white/10 hover:bg-white/5 transition-colors cursor-pointer rounded-2xl">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between text-zinc-500 group-hover:text-[#FF6B35] transition-colors">
                                    <h3 className="font-bold text-white text-lg tracking-tight line-clamp-1">Broadcast Media Africa</h3>
                                    <ExternalLink className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <blockquote className="space-y-4">
                                    <p className="text-zinc-300 font-medium leading-relaxed group-hover:text-white transition-colors">
                                        "Tingo AI Radio 102.5 FM: Africa's revolutionary AI-powered radio station launches in Nigeria."
                                    </p>
                                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-zinc-600">
                                        <Newspaper className="h-3 w-3" /> Launch News
                                    </div>
                                </blockquote>
                            </CardContent>
                        </Card>
                    </a>

                    {/* Article 3 */}
                    <a href="https://www.vanguardngr.com/2025/04/tingo-ai-showcases-groundbreaking-innovations-at-gitex-africa-2025-in-morocco/" target="_blank" rel="noopener noreferrer" className="block group">
                        <Card className="h-full bg-zinc-950/50 border-white/10 hover:bg-white/5 transition-colors cursor-pointer rounded-2xl">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between text-zinc-500 group-hover:text-[#FF6B35] transition-colors">
                                    <h3 className="font-bold text-white text-lg tracking-tight">Vanguard</h3>
                                    <ExternalLink className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <blockquote className="space-y-4">
                                    <p className="text-zinc-300 font-medium leading-relaxed group-hover:text-white transition-colors">
                                        "Tingo AI showcases groundbreaking innovations at GITEX Africa in Morocco."
                                    </p>
                                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-zinc-600">
                                        <Newspaper className="h-3 w-3" /> Event Coverage
                                    </div>
                                </blockquote>
                            </CardContent>
                        </Card>
                    </a>

                    {/* Article 4 */}
                    <a href="https://www.wearetech.africa/en/fils-uk/news/tech/nigeria-ai-powered-radio-station-tingo-ai-fm-launched-in-lagos" target="_blank" rel="noopener noreferrer" className="block group">
                        <Card className="h-full bg-zinc-950/50 border-white/10 hover:bg-white/5 transition-colors cursor-pointer rounded-2xl">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between text-zinc-500 group-hover:text-[#FF6B35] transition-colors">
                                    <h3 className="font-bold text-white text-lg tracking-tight line-clamp-1">We Are Tech Africa</h3>
                                    <ExternalLink className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <blockquote className="space-y-4">
                                    <p className="text-zinc-300 font-medium leading-relaxed group-hover:text-white transition-colors">
                                        "Nigeria AI-powered radio station Tingo AI FM launched in Lagos."
                                    </p>
                                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-zinc-600">
                                        <Newspaper className="h-3 w-3" /> Tech News
                                    </div>
                                </blockquote>
                            </CardContent>
                        </Card>
                    </a>

                    {/* Article 5 */}
                    <a href="https://thebossnewspapers.com/2025/07/29/tingo-ai-unveils-community-as-a-service-platform-gpu-powered-ai-factory-in-victoria-island/" target="_blank" rel="noopener noreferrer" className="block group md:col-span-2 lg:col-span-1">
                        <Card className="h-full bg-zinc-950/50 border-white/10 hover:bg-white/5 transition-colors cursor-pointer rounded-2xl">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between text-zinc-500 group-hover:text-[#FF6B35] transition-colors">
                                    <h3 className="font-bold text-white text-lg tracking-tight">The Boss Newspapers</h3>
                                    <ExternalLink className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <blockquote className="space-y-4">
                                    <p className="text-zinc-300 font-medium leading-relaxed group-hover:text-white transition-colors">
                                        "Tingo AI unveils Community as a Service platform GPU-powered AI factory in Victoria Island."
                                    </p>
                                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-zinc-600">
                                        <Newspaper className="h-3 w-3" /> Infrastructure
                                    </div>
                                </blockquote>
                            </CardContent>
                        </Card>
                    </a>

                    {/* Article 6 */}
                    <a href="https://thebossnewspapers.com/2025/04/03/tingogpt-officially-launches-in-los-angeles-ushers-in-a-new-era-of-ai-powered-innovation-inclusivity/" target="_blank" rel="noopener noreferrer" className="block group md:col-span-2 lg:col-span-1">
                        <Card className="h-full bg-zinc-950/50 border-white/10 hover:bg-white/5 transition-colors cursor-pointer rounded-2xl">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between text-zinc-500 group-hover:text-[#FF6B35] transition-colors">
                                    <h3 className="font-bold text-white text-lg tracking-tight">The Boss Newspapers</h3>
                                    <ExternalLink className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <blockquote className="space-y-4">
                                    <p className="text-zinc-300 font-medium leading-relaxed group-hover:text-white transition-colors">
                                        "TingoGPT officially launches in Los Angeles, ushers in a new era of AI-powered innovation and inclusivity."
                                    </p>
                                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-zinc-600">
                                        <Newspaper className="h-3 w-3" /> Global Expansion
                                    </div>
                                </blockquote>
                            </CardContent>
                        </Card>
                    </a>

                </div>
            </div>
        </section>
    )
}
