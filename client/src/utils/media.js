// Central helpers for portfolio media (photos + videos).
// Optimization strategy:
// - Photos: Cloudinary resizes (w_600 grid / w_800 detail), f_auto + q_auto,
//   lazy loading, decoding="async".
// - Videos: NEVER load video bytes in grids. Show an optimized poster image
//   (thumbnailUrl or so_1 frame) with preload="none"; only fetch the mp4
//   after user presses play. Server caps uploads at 720p / q_auto.

export const isVideoItem = (item) =>
  item?.mediaType === 'video' || item?.resourceType === 'video';

export const photoThumb = (url, width = 600) => {
  if (!url?.includes('cloudinary')) return url;
  return url.replace('/upload/', `/upload/w_${width},c_fill,f_auto,q_auto/`);
};

export const photoFull = (url) => {
  if (!url?.includes('cloudinary')) return url;
  return url.replace('/upload/', '/upload/w_1600,f_auto,q_auto/');
};

export const photoPlaceholder = (url) => {
  if (!url?.includes('cloudinary')) return '';
  return url.replace('/upload/', '/upload/w_40,c_fill,e_blur:1000,f_auto,q_10/');
};

// Poster for a video item: prefer stored thumbnailUrl, else derive a
// first-second frame from the video URL (no extra upload needed).
export const videoPoster = (item, width = 600) => {
  if (item?.thumbnailUrl) {
    return item.thumbnailUrl.includes('/upload/')
      ? item.thumbnailUrl.replace('/upload/', `/upload/w_${width},c_fill,f_auto,q_auto/`)
      : item.thumbnailUrl;
  }
  const url = item?.url || '';
  if (url.includes('cloudinary') && url.includes('/video/upload/')) {
    return url
      .replace('/video/upload/', `/video/upload/so_1,w_${width},c_fill,f_jpg,q_auto/`)
      .replace(/\.(mp4|webm|mov)(\?.*)?$/i, '.jpg');
  }
  return '';
};

// Delivery URL capped for fast streaming (720p, auto codec/quality).
export const optimizedVideoUrl = (item) => {
  const url = item?.url || '';
  if (url.includes('cloudinary') && url.includes('/video/upload/')) {
    // Don't double-apply if already transformed
    if (/\/video\/upload\/.*w_\d+/.test(url)) return url;
    return url.replace('/video/upload/', '/video/upload/w_1280,c_limit,q_auto,f_auto/');
  }
  return url;
};

export const formatDuration = (sec) => {
  if (!sec || Number.isNaN(sec)) return '';
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
