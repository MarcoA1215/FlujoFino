import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { IonIcon } from '@ionic/react';
import { closeOutline, openOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

interface ImageViewerContextType {
  openImage: (urlOrUrls: string | string[], title?: string, initialIndex?: number) => void;
  closeImage: () => void;
}

const ImageViewerContext = createContext<ImageViewerContextType>({
  openImage: () => {},
  closeImage: () => {}
});

export const useImageViewer = () => useContext(ImageViewerContext);

export const ImageViewerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageTitle, setImageTitle] = useState<string | undefined>(undefined);
  const touchStartX = useRef<number | null>(null);

  const openImage = useCallback((urlOrUrls: string | string[], title?: string, initialIndex = 0) => {
    if (!urlOrUrls) return;
    const list = Array.isArray(urlOrUrls) ? urlOrUrls.filter(Boolean) : [urlOrUrls].filter(Boolean);
    if (list.length === 0) return;

    setImages(list);
    const validIndex = Math.max(0, Math.min(initialIndex, list.length - 1));
    setCurrentIndex(validIndex);
    setImageTitle(title);
    setIsOpen(true);
  }, []);

  const closeImage = useCallback(() => {
    setIsOpen(false);
    setImages([]);
    setCurrentIndex(0);
    setImageTitle(undefined);
  }, []);

  const prevImage = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // Listen for Escape and Arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        closeImage();
      } else if (e.key === 'ArrowLeft') {
        prevImage();
      } else if (e.key === 'ArrowRight') {
        nextImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeImage, prevImage, nextImage]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        prevImage();
      } else {
        nextImage();
      }
    }
    touchStartX.current = null;
  };

  const currentImageUrl = images[currentIndex] || null;

  return (
    <ImageViewerContext.Provider value={{ openImage, closeImage }}>
      {children}
      {isOpen && currentImageUrl && (
        <div 
          onClick={closeImage}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.15s ease-out',
            userSelect: 'none',
          }}
        >
          {/* Top Header / Actions Bar */}
          <div 
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              right: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10
            }}
          >
            {/* Counter pill if multi-image */}
            {images.length > 1 ? (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  backdropFilter: 'blur(6px)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: '6px 14px',
                  borderRadius: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                {currentIndex + 1} / {images.length}
              </div>
            ) : <div />}

            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href={currentImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Abrir imagen en nueva pestaña"
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  cursor: 'pointer'
                }}
              >
                <IonIcon icon={openOutline} style={{ fontSize: '20px' }} />
              </a>

              <button
                onClick={(e) => { e.stopPropagation(); closeImage(); }}
                title="Cerrar vista previa"
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                }}
              >
                <IonIcon icon={closeOutline} style={{ fontSize: '26px' }} />
              </button>
            </div>
          </div>

          {/* Previous Arrow Button */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              title="Imagen anterior"
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255, 255, 255, 0.22)',
                backdropFilter: 'blur(6px)',
                border: 'none',
                borderRadius: '50%',
                width: '46px',
                height: '46px',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                zIndex: 10,
              }}
            >
              <IonIcon icon={chevronBackOutline} style={{ fontSize: '26px' }} />
            </button>
          )}

          {/* Centered Image Preview Container */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{
              maxWidth: '92vw',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <img 
              src={currentImageUrl} 
              alt={imageTitle || 'Vista previa'} 
              style={{
                maxWidth: '92vw',
                maxHeight: '78vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                userSelect: 'none'
              }}
            />
            {imageTitle && (
              <div 
                style={{
                  marginTop: '12px',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  textAlign: 'center',
                  background: 'rgba(0, 0, 0, 0.65)',
                  padding: '6px 18px',
                  borderRadius: '20px',
                  maxWidth: '85vw',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                {imageTitle}
              </div>
            )}
          </div>

          {/* Next Arrow Button */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              title="Imagen siguiente"
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255, 255, 255, 0.22)',
                backdropFilter: 'blur(6px)',
                border: 'none',
                borderRadius: '50%',
                width: '46px',
                height: '46px',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                zIndex: 10,
              }}
            >
              <IonIcon icon={chevronForwardOutline} style={{ fontSize: '26px' }} />
            </button>
          )}
        </div>
      )}
    </ImageViewerContext.Provider>
  );
};
