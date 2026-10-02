import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowRight, Clock, Heart, Scissors, ShieldCheck, Sparkles, Star, MapPin, Phone, MessageCircle } from 'lucide-react';
import { getRecentPortfolio, getServices, getStaff } from '../../api';
import Lightbox from '../../components/ui/Lightbox';
import { CardSkeleton, Skeleton } from '../../components/ui/Skeleton';

const avatar = (member) => member.photo ? <img src={member.photo} alt={member.name} className="h-full w-full object-cover" /> : member.name?.split(' ').map((word) => word[0]).join('');

export default function LandingPage() {
  const [data, setData] = useState({ services: [], staff: [], work: [] });
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  useEffect(() => { Promise.all([getServices(), getStaff(), getRecentPortfolio(8)]).then(([services, staff, work]) => setData({ services: services.data.slice(0, 4), staff: staff.data.slice(0, 4), work: work.data })).catch(console.error).finally(() => setLoading(false)); }, []);

  return <main className="overflow-hidden bg-background">
    {/* ═══ 1. HERO ═══ */}
    <section className="relative isolate min-h-[650px] overflow-hidden bg-primary-700 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(217,154,166,.4),transparent_35%),radial-gradient(circle_at_15%_80%,rgba(197,164,109,.2),transparent_30%)]" />
      <div className="absolute right-[-8%] top-20 h-[440px] w-[440px] rounded-full border border-white/15" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:px-10 lg:py-28">
        <div>
          <p className="eyebrow !text-highlight-300">Modern ritual · considered care</p>
          <h1 className="mt-5 max-w-3xl font-display text-6xl font-bold leading-[.82] sm:text-7xl lg:text-8xl">
            Your style,<br/><em className="font-normal text-accent-400">your moment</em>.
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
            Thoughtful hair, skin and nail rituals made around you. Find your moment of quiet luxury at Belleza.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/booking" className="rounded-full px-6 py-3 text-center font-medium shadow-sm hover:shadow-float transition-all bg-highlight-400 text-primary-900">
              Book Now <ArrowRight className="ml-1 inline h-4 w-4" />
            </Link>
            <Link to="/services" className="rounded-full border border-white/30 px-6 py-3 text-center font-medium hover:bg-white/10 transition-all">
              Explore Services
            </Link>
          </div>
          <div className="mt-14 flex items-center gap-4 text-sm text-white/70">
            <div className="flex -space-x-2">{[1,2,3].map(i => <span key={i} className="h-8 w-8 rounded-full border-2 border-primary-700 bg-accent-400" />)}</div>
            <span><b className="text-white">4.9/5</b> from our guests</span>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div className="aspect-[4/5] overflow-hidden rounded-t-[9rem] rounded-b-[2rem] bg-accent-200 shadow-2xl">
            <img className="h-full w-full object-cover" src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=85" alt="Salon styling experience" />
          </div>
          <div className="absolute -bottom-5 -left-4 rounded-2xl bg-surface p-4 text-ink-900 shadow-float">
            <p className="eyebrow">Today at Belleza</p>
            <p className="mt-1 font-display text-2xl font-bold">Feel like yourself,<br/>only more so.</p>
          </div>
        </div>
      </div>
    </section>

    {/* ═══ 2. POPULAR SERVICES ═══ */}
    <section className="bg-surface py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Popular services</p>
            <h2 className="section-title mt-3">The things we do <em className="text-primary-600">beautifully.</em></h2>
          </div>
          <Link to="/services" className="hidden text-sm font-bold text-primary-700 sm:block">All services <ArrowRight className="inline h-4 w-4" /></Link>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? [1,2,3,4].map(i => <CardSkeleton key={i} />) : data.services.map(service =>
            <article key={service._id} className="group rounded-3xl bg-background p-6 transition hover:-translate-y-1 border border-ink-100">
              <div className="flex justify-between">
                <span className="eyebrow">{service.category}</span>
                <span className="font-display text-2xl font-bold text-primary-700">${service.price}</span>
              </div>
              <h3 className="mt-9 text-xl font-bold text-ink-900">{service.name}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-ink-500">{service.description}</p>
              <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-4 text-sm">
                <span className="flex items-center gap-2 text-ink-500"><Clock className="h-4 w-4" />{service.durationMinutes} min</span>
                <Link to="/booking" className="font-bold text-primary-700 hover:text-primary-600">Book <ArrowRight className="inline h-4 w-4" /></Link>
              </div>
            </article>
          )}
        </div>
      </div>
    </section>

    {/* ═══ 3. WHY CHOOSE US ═══ */}
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
      <div className="max-w-2xl">
        <p className="eyebrow">Why choose us</p>
        <h2 className="section-title mt-3">Beauty that feels like a <em className="text-primary-600">pause.</em></h2>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {[
          { icon: Scissors, title: 'Expert hands', text: 'Warm, highly trained professionals who listen before they create.' },
          { icon: Heart, title: 'Made personal', text: 'Every service is shaped around your features, mood and daily routine.' },
          { icon: ShieldCheck, title: 'Carefully chosen', text: 'Elevated formulas and considered rituals for hair and skin health.' },
        ].map(({ icon: Icon, title, text }) =>
          <article key={title} className="card p-7">
            <div className="h-12 w-12 rounded-2xl bg-highlight-50 flex items-center justify-center">
              <Icon className="h-6 w-6 text-highlight-500" />
            </div>
            <h3 className="mt-8 text-lg font-bold text-ink-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-500">{text}</p>
          </article>
        )}
      </div>
    </section>

    {/* ═══ 4. GALLERY ═══ */}
    <section className="bg-primary-700 py-20 text-white">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <p className="eyebrow !text-highlight-300">Gallery</p>
        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <h2 className="section-title !text-white">Little transformations,<br/><em className="text-accent-400">big feeling.</em></h2>
          <p className="max-w-sm text-sm leading-6 text-white/60">A glimpse of the tailored looks our artists create every day.</p>
        </div>
        {loading ? <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">{[1,2,3,4].map(i => <Skeleton key={i} className="aspect-square rounded-2xl bg-white/10" />)}</div> :
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            {data.work.map((photo, index) =>
              <button onClick={() => setLightboxIndex(index)} key={photo._id} className="group aspect-square overflow-hidden rounded-2xl bg-white/10">
                <img src={photo.url?.replace('/upload/', '/upload/w_600,c_fill,f_auto,q_auto/')} alt={photo.caption || 'Recent salon work'} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" loading="lazy" />
              </button>
            )}
          </div>
        }
      </div>
    </section>

    {/* ═══ 5. OUR TEAM ═══ */}
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Our artists</p>
          <h2 className="section-title mt-3">Meet the people behind<br/>the mirror.</h2>
        </div>
        <Link to="/team" className="hidden text-sm font-bold text-primary-700 sm:block">Meet the team <ArrowRight className="inline h-4 w-4" /></Link>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? [1,2,3,4].map(i => <Skeleton key={i} className="aspect-[3/4] rounded-3xl" />) : data.staff.map(member =>
          <Link to={`/team/${member._id}`} key={member._id} className="group">
            <div className="aspect-[3/4] overflow-hidden rounded-3xl bg-primary-100">
              <div className="h-full w-full text-center text-4xl font-display font-bold text-primary-700 flex items-center justify-center">{avatar(member)}</div>
            </div>
            <h3 className="mt-4 font-bold text-ink-900">{member.name}</h3>
            <p className="mt-1 text-xs text-ink-500">{member.specialties?.slice(0, 2).join(' · ') || 'Salon artist'}</p>
          </Link>
        )}
      </div>
    </section>

    {/* ═══ 6. TESTIMONIAL + CTA ═══ */}
    <section className="bg-surface-alt">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:px-10">
        <div className="rounded-[2rem] bg-primary-100 p-8 sm:p-12">
          <div className="flex gap-1 text-highlight-500">{[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
          <blockquote className="mt-8 font-display text-4xl font-bold leading-tight text-ink-900">"I walked out feeling more like myself than I had in months."</blockquote>
          <p className="mt-8 text-sm text-ink-500">— Maya R., regular guest</p>
        </div>
        <div className="flex flex-col justify-center">
          <p className="eyebrow">A little escape awaits</p>
          <h2 className="section-title mt-3">Make time for your <em className="text-primary-600">best self.</em></h2>
          <p className="mt-5 max-w-md leading-7 text-ink-500">Find an appointment that fits your day. We'll take care of the rest.</p>
          <Link to="/booking" className="btn-primary mt-8 w-fit">Find your appointment <ArrowRight className="ml-1 inline h-4 w-4" /></Link>
        </div>
      </div>
    </section>

    {/* ═══ 7. ABOUT ═══ */}
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">About Belleza</p>
          <h2 className="section-title mt-3">Where beauty meets <em className="text-primary-600">quiet luxury.</em></h2>
          <p className="mt-6 leading-7 text-ink-500">
            At Belleza, we believe beauty should feel effortless. Our studio is designed as a calm retreat where you
            can slow down and be cared for by thoughtful professionals. From the moment you step in, every detail —
            from the products we choose to the rituals we've perfected — is made for your comfort and confidence.
          </p>
          <p className="mt-4 leading-7 text-ink-500">
            We're a team of passionate artists who stay curious, train constantly, and genuinely love what we do.
            Your visit is never just an appointment — it's a little moment of self-care you deserve.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-primary-100 p-6 text-center">
            <p className="font-display text-4xl font-bold text-primary-700">5+</p>
            <p className="mt-1 text-sm text-ink-500">Years of craft</p>
          </div>
          <div className="rounded-2xl bg-highlight-50 p-6 text-center">
            <p className="font-display text-4xl font-bold text-highlight-600">4.9</p>
            <p className="mt-1 text-sm text-ink-500">Guest rating</p>
          </div>
          <div className="rounded-2xl bg-accent-50 p-6 text-center">
            <p className="font-display text-4xl font-bold text-accent-600">500+</p>
            <p className="mt-1 text-sm text-ink-500">Happy guests</p>
          </div>
          <div className="rounded-2xl bg-surface-alt p-6 text-center">
            <p className="font-display text-4xl font-bold text-ink-900">100%</p>
            <p className="mt-1 text-sm text-ink-500">Premium products</p>
          </div>
        </div>
      </div>
    </section>

    {/* ═══ 8. LOCATION & CONTACT ═══ */}
    <section className="bg-surface-alt py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="text-center">
          <p className="eyebrow">Visit us</p>
          <h2 className="section-title mt-3">We'd love to see you.</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="card p-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-primary-100 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-primary-700" />
            </div>
            <h3 className="mt-5 font-bold text-ink-900">Our Location</h3>
            <p className="mt-2 text-sm text-ink-500">123 Beauty Lane, Suite 100<br />New York, NY 10001</p>
          </div>
          <div className="card p-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-highlight-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-highlight-600" />
            </div>
            <h3 className="mt-5 font-bold text-ink-900">Opening Hours</h3>
            <p className="mt-2 text-sm text-ink-500">Mon–Fri: 9 AM – 6 PM<br />Sat: 10 AM – 4 PM<br />Sun: Closed</p>
          </div>
          <div className="card p-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-accent-100 flex items-center justify-center">
              <Phone className="h-6 w-6 text-accent-600" />
            </div>
            <h3 className="mt-5 font-bold text-ink-900">Get in Touch</h3>
            <p className="mt-2 text-sm text-ink-500">(555) 123-4567<br />hello@belleza.com</p>
            <a href="https://wa.me/15551234567" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary-700 hover:text-primary-600">
              <MessageCircle className="h-4 w-4" /> WhatsApp us
            </a>
          </div>
        </div>
      </div>
    </section>

    <Lightbox images={data.work} currentIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} onPrev={() => setLightboxIndex(i => Math.max(0, i - 1))} onNext={() => setLightboxIndex(i => Math.min(data.work.length - 1, i + 1))} />
  </main>;
}
