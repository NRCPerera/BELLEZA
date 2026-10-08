import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { getStaff, getStaffMember, getStaffPortfolio } from '../../api';
import Lightbox from '../../components/ui/Lightbox';
import StaffCard from '../../components/ui/StaffCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { isVideoItem, photoPlaceholder, photoThumb, videoPoster, formatDuration } from '../../utils/media';

const Portrait = ({ member, className = '' }) => (
  <div className={`overflow-hidden bg-primary-100 text-center font-display text-4xl font-bold text-primary-700 ${className}`}>
    {member.photo ? (
      <img src={photoThumb(member.photo, 600)} alt={member.name} width="520" height="650" fetchPriority="high" className="h-full w-full object-cover" />
    ) : (
      member.name?.split(' ').map((x) => x[0]).join('')
    )}
  </div>
);

const gridSrc = (item) =>
  isVideoItem(item) ? videoPoster(item, 800) : photoThumb(item.url, 800);

export default function StaffPage() {
  const { id } = useParams();
  const [staff, setStaff] = useState([]);
  const [member, setMember] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    const req = id
      ? Promise.all([getStaffMember(id), getStaffPortfolio(id, { limit: 50 })])
      : getStaff();
    req
      .then((res) =>
        id
          ? (setMember(res[0].data), setPhotos(res[1].data.photos || []))
          : setStaff(res.data)
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (id)
    return (
      <main className="min-h-screen bg-champagne-50">
        {loading ? (
          <div className="mx-auto max-w-7xl px-5 py-16">
            <Skeleton className="h-80 rounded-[2rem]" />
          </div>
        ) : (
          member && (
            <>
              <section className="bg-ink-900 text-white">
                <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[260px_1fr] md:items-end lg:px-10">
                  <Portrait member={member} className="aspect-[4/5] w-52 rounded-t-[6rem] rounded-b-3xl" />
                  <div>
                    <Link to="/team" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
                      <ArrowLeft className="h-4 w-4" /> All artists
                    </Link>
                    <p className="eyebrow mt-8 !text-champagne-200">Salon artist</p>
                    <h1 className="mt-2 font-display text-5xl font-bold sm:text-6xl">{member.name}</h1>
                    <p className="mt-5 max-w-2xl leading-7 text-white/65">
                      {member.bio || 'A thoughtful artist dedicated to a look that feels entirely your own.'}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {member.specialties?.map((s) => (
                        <span key={s} className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
              <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <p className="eyebrow">Their portfolio</p>
                    <h2 className="section-title mt-3">
                      Work with a point<br />of <em className="text-primary-600">view.</em>
                    </h2>
                  </div>
                  <Link to={`/booking?staffId=${member._id}`} className="btn-primary">
                    Book with {member.name.split(' ')[0]} <ArrowRight className="ml-1 inline h-4 w-4" />
                  </Link>
                </div>
                {photos.length ? (
                  <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                    {photos.map((item, index) => (
                      <button
                        key={item._id}
                        onClick={() => setLightbox(index)}
                        style={!isVideoItem(item) ? { backgroundImage: `url(${photoPlaceholder(item.url)})`, backgroundSize: 'cover' } : undefined}
                        className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-primary-100"
                      >
                        <img
                          src={gridSrc(item)}
                          srcSet={isVideoItem(item) ? undefined : [400, 800, 1200].map(width => `${photoThumb(item.url, width)} ${width}w`).join(', ')}
                          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                          width={item.width || 800}
                          height={item.height || 1000}
                          alt={item.caption || `${member.name}'s work`}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                          loading="lazy"
                          decoding="async"
                        />
                        {isVideoItem(item) && (
                          <>
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white">
                                <Play className="ml-0.5 h-5 w-5" />
                              </span>
                            </span>
                            {!!item.duration && (
                              <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
                                {formatDuration(item.duration)}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="py-20 text-center text-ink-500">No portfolio items yet.</p>
                )}
              </section>
              <Lightbox
                images={photos}
                currentIndex={lightbox}
                onClose={() => setLightbox(null)}
                onPrev={() => setLightbox((i) => Math.max(0, i - 1))}
                onNext={() => setLightbox((i) => Math.min(photos.length - 1, i + 1))}
              />
            </>
          )
        )}
      </main>
    );

  return (
    <main className="min-h-screen bg-champagne-50">
      <section className="bg-primary-100 px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="eyebrow">The people behind your glow</p>
          <h1 className="mt-3 max-w-2xl font-display text-5xl font-bold sm:text-6xl">
            Artists who make every detail <em className="text-primary-600">personal.</em>
          </h1>
          <p className="mt-5 max-w-xl leading-7 text-ink-500">
            Meet our talented team, then explore their individual point of view.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        {loading ? (
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-3xl" />
            ))}
          </div>
        ) : staff.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {staff.map((person) => (
              <StaffCard key={person._id} member={person} />
            ))}
          </div>
        ) : (
          <p className="py-20 text-center text-ink-500">No team members listed yet.</p>
        )}
      </section>
    </main>
  );
}
