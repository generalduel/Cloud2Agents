import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarImage } from '@/components/ui/avatar'

export default function HeroSimple() {
    return (
        <section className="bg-muted/50 dark:bg-background overflow-hidden py-16 md:py-32">
            <div className="mx-auto max-w-5xl px-6">
                <div className="relative z-10 mx-auto max-w-3xl text-center">
                    <h1 className="text-balance text-4xl font-semibold md:text-5xl lg:text-6xl">
                        Generate your website in minutes with AI in your browser
                    </h1>
                    <p className="text-muted-foreground mx-auto my-8 max-w-2xl text-xl">
                        We are a team of developers who are passionate about creating beautiful and functional websites with AI in your browser.
                    </p>

                    <Button
                        asChild
                        size="lg">
                        <Link href="#">
                            <span>Get Started</span>
                        </Link>
                    </Button>

                    <div className="mx-auto mt-10 flex w-fit flex-col items-center gap-4 sm:flex-row">
                        <span className="mx-4 inline-flex items-center -space-x-4">
                            <Avatar className="size-14 border bg-white">
                                <AvatarImage
                                    src="https://api.dicebear.com/9.x/lorelei/svg?seed=John"
                                    alt="User avatar"
                                />
                            </Avatar>
                            <Avatar className="size-14 border bg-white">
                                <AvatarImage
                                    src="https://api.dicebear.com/9.x/lorelei/svg?seed=Jane"
                                    alt="User avatar"
                                />
                            </Avatar>
                            <Avatar className="size-14 border bg-white">
                                <AvatarImage
                                    src="https://api.dicebear.com/9.x/lorelei/svg?seed=David"
                                    alt="User avatar"
                                />
                            </Avatar>
                            <Avatar className="size-14 border bg-white">
                                <AvatarImage
                                    src="https://api.dicebear.com/9.x/lorelei/svg?seed=Emily"
                                    alt="User avatar"
                                />
                            </Avatar>
                            <Avatar className="size-14 border bg-white">
                                <AvatarImage
                                    src="https://api.dicebear.com/9.x/lorelei/svg?seed=Michael"
                                    alt="User avatar"
                                />
                            </Avatar>
                        </span>
                        <div>
                            <div className="flex items-center gap-1">
                                <Star className="size-5 fill-yellow-400 text-yellow-400" />
                                <Star className="size-5 fill-yellow-400 text-yellow-400" />
                                <Star className="size-5 fill-yellow-400 text-yellow-400" />
                                <Star className="size-5 fill-yellow-400 text-yellow-400" />
                                <Star className="size-5 fill-yellow-400 text-yellow-400" />
                                <span className="font-semibold">5.0</span>
                            </div>
                            <p className="text-left font-medium text-muted-foreground">
                                from 200+ reviews
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
