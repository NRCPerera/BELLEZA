import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const initials = (name) =>
  name?.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

// Modern staff card: circular profile photo on top,
// details on a solid card body below (readable on any photo).
// Used on the home team section and the Our Team page.
const StaffCard = ({ member }) => (
  <article className="group flex flex-col items-center overflow-hidden rounded-[1.75rem] bg-white p-6 pt-8 text-center shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-float">
    <Link
      to={`/team/${member._id}`}
      className="relative block"
      aria-label={`View ${member.name}'s profile`}
    >
      <span className="block h-36 w-36 overflow-hidden rounded-full bg-primary-100 ring-4 ring-primary-100 transition group-hover:ring-highlight-400">
        {member.photo ? (
          <img
            src={member.photo}
            alt={member.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-200 via-primary-100 to-champagne-200 font-display text-5xl font-bold text-primary-700">
            {initials(member.name)}
          </span>
        )}
      </span>
      <span className="absolute -right-1 bottom-2 grid h-10 w-10 place-items-center rounded-full bg-primary-700 text-white shadow-md transition group-hover:bg-highlight-400 group-hover:text-primary-900">
        <ArrowUpRight className="h-5 w-5" />
      </span>
    </Link>

    <p className="eyebrow mt-5">Salon artist</p>
    <h3 className="mt-1 font-display text-xl font-bold leading-tight text-ink-900">
      <Link to={`/team/${member._id}`} className="transition hover:text-primary-700">
        {member.name}
      </Link>
    </h3>
    <div className="mt-2 flex flex-wrap justify-center gap-1.5">
      {(member.specialties?.slice(0, 3).length ? member.specialties.slice(0, 3) : ['Salon artist']).map((s) => (
        <span key={s} className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-medium text-primary-700">
          {s}
        </span>
      ))}
    </div>
    <div className="mt-5 flex w-full gap-2">
      <Link
        to={`/team/${member._id}`}
        className="flex-1 rounded-full border border-ink-100 px-4 py-2 text-center text-xs font-bold text-ink-700 transition hover:border-primary-300 hover:text-primary-700"
      >
        View profile
      </Link>
      <Link
        to={`/booking?staffId=${member._id}`}
        className="flex-1 rounded-full bg-primary-700 px-4 py-2 text-center text-xs font-bold text-white transition hover:bg-primary-600"
      >
        Book
      </Link>
    </div>
  </article>
);

export default StaffCard;
