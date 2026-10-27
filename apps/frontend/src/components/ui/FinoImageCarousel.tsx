import React, { useState, useRef, useCallback } from 'react';
import { IonIcon } from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline, imageOutline } from 'ionicons/icons';

export interface FinoImageCarouselProps {
  images: string[];
  alt?: string;
  height?: string | number;
  aspectRatio?: string;
  borderRadius?: string;
  objectFit?: 'cover' | 'contain';
  badge?: React.ReactNode;
  badgePosition?: 'top-left' | 'top-right';
  onImageClick?: (index: number, url: string) => void;
  showArrows?: boolean;
  showDots?: boolean;
  showCounter?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const FinoImageCarousel: React.FC<FinoImageCarouselProps> = ({
  images,
  alt = 'Imagen',
  height = '160px',
  aspectRatio,
  borderRadius = '12px 12px 0 0',
  objectFit = 'cover',
  badge,
  badgePosition = 'top-left',
  onImageClick,
  showArrows = true,
  showDots = true,
  showCounter = true,
  style,
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const validImages = Array.isArray(images)
    ? images.map((img) => (typeof img === 'string' ? img.trim() : '')).filter(Boolean)
    : [];

  const total = validImages.length;
  const safeIndex = total > 0 ? Math.min(currentIndex, total - 1) : 0;
  const currentImage = validImages[safeIndex] || null;

  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      if (total <= 1) return;
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
    },
    [total]
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      if (total <= 1) return;
      setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
    },
    [total]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    if (total <= 1) return;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || total <= 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX.current;
    if (Math.abs(diff) > 35) {
      if (diff > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
    touchStartX.current = null;
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (onImageClick && currentImage) {
      e.stopPropagation();
      onImageClick(safeIndex, currentImage);
    }
  };

  if (total === 0 || !currentImage) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          height: aspectRatio ? undefined : height,
          aspectRatio,
          borderRadius,
          backgroundColor: '#F1F5F9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94A3B8',
          position: 'relative',
          overflow: 'hidden',
          ...style,
        }}
      >
        <IonIcon icon={imageOutline} style={{ fontSize: '32px', marginBottom: '4px' }} />
        <span style={{ fontSize: '11px', fontWeight: 600 }}>Sin imagen</span>
        {badge && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: badgePosition === 'top-left' ? '8px' : undefined,
              right: badgePosition === 'top-right' ? '8px' : undefined,
              zIndex: 3,
            }}
          >
            {badge}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        width: '100%',
        height: aspectRatio ? undefined : height,
        aspectRatio,
        borderRadius,
        overflow: 'hidden',
        backgroundColor: '#0F172A',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Active Image */}
      <img
        src={currentImage}
        alt={`${alt} (${safeIndex + 1}/${total})`}
        onClick={handleImageClick}
        loading="lazy"
        title={onImageClick ? 'Toca para ampliar imagen' : undefined}
        style={{
          width: '100%',
          height: '100%',
          objectFit,
          display: 'block',
          cursor: onImageClick ? 'zoom-in' : 'default',
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Badge Slot */}
      {badge && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '8px',
            left: badgePosition === 'top-left' ? '8px' : undefined,
            right: badgePosition === 'top-right' ? '8px' : undefined,
            zIndex: 4,
          }}
        >
          {badge}
        </div>
      )}

      {/* Counter Pill (Top Right, if badge is on left, or bottom right) */}
      {showCounter && total > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: badgePosition === 'top-right' ? '36px' : '8px',
            right: '8px',
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            color: '#FFFFFF',
            fontSize: '10px',
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
            zIndex: 3,
            letterSpacing: '0.5px',
          }}
        >
          {safeIndex + 1}/{total}
        </div>
      )}

      {/* Navigation Arrows (if multi-image) */}
      {showArrows && total > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            title="Anterior"
            style={{
              position: 'absolute',
              top: '50%',
              left: '6px',
              transform: 'translateY(-50%)',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 3,
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              padding: 0,
            }}
          >
            <IonIcon icon={chevronBackOutline} style={{ fontSize: '18px' }} />
          </button>

          <button
            type="button"
            onClick={handleNext}
            title="Siguiente"
            style={{
              position: 'absolute',
              top: '50%',
              right: '6px',
              transform: 'translateY(-50%)',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 3,
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              padding: 0,
            }}
          >
            <IonIcon icon={chevronForwardOutline} style={{ fontSize: '18px' }} />
          </button>
        </>
      )}

      {/* Bottom Dot Indicators (if multi-image) */}
      {showDots && total > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '7px',
            left: '0',
            right: '0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '5px',
            zIndex: 3,
          }}
        >
          {validImages.map((_, idx) => {
            const isActive = idx === safeIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                title={`Ir a imagen ${idx + 1}`}
                style={{
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  width: isActive ? '14px' : '5px',
                  height: '5px',
                  borderRadius: isActive ? '3px' : '50%',
                  backgroundColor: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.55)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
