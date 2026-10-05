import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, Camera, Clock, Film, Heart, Scissors, ShieldCheck, Sparkles, Star, MapPin, Phone, MessageCircle, Play } from 'lucide-react';
import { getRecentPortfolio, getServices, getStaff } from '../../api';
import Lightbox from '../../components/ui/Lightbox';
import StaffCard from '../../components/ui/StaffCard';
import { CardSkeleton, Skeleton } from '../../components/ui/Skeleton';
import { isVideoItem, photoThumb, videoPoster, formatDuration } from '../../utils/media';

const gallerySrc = (item) =>
  isVideoItem(item) ? videoPoster(item, 800) : photoThumb(item?.url, 800);

// Bento mosaic spans: hero tile first, one tall tile, rest uniform.
// Keeps the grid rhythmic on every breakpoint.
const spanClass = (index) => {
  if (index === 0) return 'col-span-2 row-span-2';
  if (index === 3) return 'md:row-span-2';
  if (index === 6) return 'col-span-2 md:col-span-1';
  return '';
};

export default function LandingPage() {
  const [data, setData] = useState({ services: [], staff: [], work: [] });
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [workFilter, setWorkFilter] = useState('all'); // all | photo | video
  useEffect(() => { Promise.all([getServices(), getStaff(), getRecentPortfolio(12)]).then(([services, staff, work]) => setData({ services: services.data.slice(0, 4), staff: staff.data.slice(0, 4), work: work.data })).catch(console.error).finally(() => setLoading(false)); }, []);

  const filteredWork = useMemo(() => {
    if (workFilter === 'photo') return data.work.filter((w) => !isVideoItem(w));
    if (workFilter === 'video') return data.work.filter(isVideoItem);
    return data.work;
  }, [data.work, workFilter]);
  const photoCount = data.work.filter((w) => !isVideoItem(w)).length;
  const videoCount = data.work.filter(isVideoItem).length;

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
                <span className="font-display text-2xl font-bold text-primary-700">Rs {service.price}</span>
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

    {/* ═══ 4. PORTFOLIO — fresh from the studio ═══ */}
    <section className="relative overflow-hidden bg-primary-800 py-20 text-white sm:py-24">
      {/* ambient decoration */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(217,154,166,.28),transparent_38%),radial-gradient(circle_at_8%_90%,rgba(197,164,109,.16),transparent_32%)]" />
      <div className="pointer-events-none absolute -right-24 top-10 h-[420px] w-[420px] rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-10 top-24 h-[280px] w-[280px] rounded-full border border-white/10" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        {/* header */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow !text-highlight-300">
              <Sparkles className="mr-1 inline h-3.5 w-3.5" /> Portfolio · fresh from the studio
            </p>
            <h2 className="section-title mt-3 !text-white">
              Real work,<br /><em className="text-accent-400">real glow.</em>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/60">
              Unfiltered finishes from our chairs — cuts, colour, skin and nails,
              captured by the artists themselves.
            </p>
            {/* live counts */}
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/80">
                <Camera className="h-3.5 w-3.5 text-accent-400" /> {photoCount} photos
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/80">
                <Film className="h-3.5 w-3.5 text-highlight-300" /> {videoCount} videos
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/80">
                <Scissors className="h-3.5 w-3.5 text-white/60" /> by {data.staff.length || 'our'} artists
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-end">
            {/* filter pills */}
            <div className="inline-flex w-fit rounded-full border border-white/15 bg-white/5 p-1 text-xs font-semibold backdrop-blur">
              {[
                { key: 'all', label: 'All work' },
                { key: 'photo', label: 'Photos' },
                { key: 'video', label: 'Videos' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setWorkFilter(t.key); setLightboxIndex(null); }}
                  className={`rounded-full px-4 py-2 transition-all ${
                    workFilter === t.key
                      ? 'bg-highlight-400 text-primary-900 shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Link to="/team" className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white">
                Meet the artists
              </Link>
              <Link to="/booking" className="rounded-full bg-highlight-400 px-5 py-2.5 text-sm font-semibold text-primary-900 shadow transition hover:shadow-float">
                Book your glow <ArrowRight className="ml-1 inline h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* bento mosaic */}
        {loading ? (
          <div className="mt-10 grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[180px] md:grid-cols-4 lg:auto-rows-[200px]">
            <Skeleton className="col-span-2 row-span-2 rounded-3xl bg-white/10" />
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="rounded-3xl bg-white/10" />
            ))}
          </div>
        ) : filteredWork.length ? (
          <>
            <div className="mt-10 grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[180px] md:grid-cols-4 lg:auto-rows-[200px]">
              {filteredWork.slice(0, 8).map((item, index) => {
                const isVideo = isVideoItem(item);
                return (
                  <button
                    key={item._id}
                    onClick={() => setLightboxIndex(index)}
                    className={`group relative overflow-hidden rounded-3xl bg-white/10 text-left ring-1 ring-white/10 transition duration-300 hover:ring-white/30 ${spanClass(index)}`}
                  >
                    <img
                      src={gallerySrc(item)}
                      alt={item.caption || 'Salon portfolio work'}
                      loading={index > 1 ? 'lazy' : 'eager'}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-80 transition group-hover:opacity-95" />

                    {/* top badges */}
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                      {isVideo ? <Film className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
                      {isVideo ? 'Video' : 'Photo'}
                    </span>
                    {isVideo && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition group-hover:scale-110 group-hover:bg-highlight-400 group-hover:text-primary-900">
                          <Play className="ml-0.5 h-5 w-5 fill-current" />
                        </span>
                      </span>
                    )}
                    {!!item.duration && (
                      <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
                        {formatDuration(item.duration)}
                      </span>
                    )}

                    {/* bottom caption */}
                    <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-white">
                          {item.caption || 'Untitled look'}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-white/60">
                          {item.staff?.name ? `by ${item.staff.name}` : 'Belleza studio'}
                          {item.service?.name ? ` · ${item.service.name}` : ''}
                        </span>
                      </span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition group-hover:bg-white group-hover:text-primary-800">
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex items-center justify-between text-xs text-white/50">
              <p>Showing {Math.min(filteredWork.length, 8)} of {filteredWork.length} looks — tap any tile to view.</p>
              <Link to="/team" className="inline-flex items-center gap-1 font-bold text-highlight-300 hover:text-highlight-200">
                Explore all artists <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </>
        ) : (
          <div className="mt-10 rounded-3xl border border-dashed border-white/20 bg-white/5 p-14 text-center">
            <Camera className="mx-auto h-10 w-10 text-white/30" />
            <p className="mt-4 font-semibold text-white">No {workFilter === 'all' ? '' : workFilter + ' '}looks yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-white/50">
              Our artists are busy creating — check back soon or meet the team behind the chair.
            </p>
            <Link to="/team" className="mt-6 inline-block rounded-full border border-white/25 px-5 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/10">
              Meet the artists
            </Link>
          </div>
        )}
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
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? [1,2,3,4].map(i => <Skeleton key={i} className="aspect-[3/4] rounded-3xl" />) : data.staff.map(member =>
          <StaffCard key={member._id} member={member} />
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

    <Lightbox images={filteredWork} currentIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} onPrev={() => setLightboxIndex(i => Math.max(0, i - 1))} onNext={() => setLightboxIndex(i => Math.min(filteredWork.length - 1, i + 1))} />
  </main>;
}
