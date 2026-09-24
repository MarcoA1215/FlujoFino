import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { IonIcon } from '@ionic/react';
import { closeOutline, openOutline } from 'ionicons/icons';

interface ImageViewerContextType {
  openImage: (url: string, title?: string) => void;
  closeImage: () => void;
}

const ImageViewerContext = createContext<ImageViewerContextType>({
  openImage: () => {},
  closeImage: () => {}
});

export const useImageViewer = () => useContext(ImageViewerContext);

export const ImageViewerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageTitle, setImageTitle] = useState<string | undefined>(undefined);

  const openImage = useCallback((url: string, title?: string) => {
    if (!url) return;
    setImageUrl(url);
    setImageTitle(title);
    setIsOpen(true);
  }, []);

  const closeImage = useCallback(() => {
    setIsOpen(false);
    setImageUrl(null);
    setImageTitle(undefined);
  }, []);

  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeImage]);

  return (
    <ImageViewerContext.Provider value={{ openImage, closeImage }}>
      {children}
      {isOpen && imageUrl && (
        <div 
          onClick={closeImage}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Top Actions Bar */}
          <div 
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              display: 'flex',
              gap: '10px',
              zIndex: 10
            }}
          >
            <a
              href={imageUrl}
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

          {/* Centered Image Preview Container */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{
              maxWidth: '92vw',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img 
              src={imageUrl} 
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
                  fontSize: '1rem',
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
        </div>
      )}
    </ImageViewerContext.Provider>
  );
};
