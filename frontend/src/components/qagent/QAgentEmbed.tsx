import { useEffect, useRef } from 'react';
import { useQAgent } from '../../hooks/useQAgent';
import { EMBED_URL_EXPIRATION } from '../../utils/constants';
import './QAgentEmbed.css';

declare global {
  interface Window {
    QuickSightEmbedding: any;
  }
}

export const QAgentEmbed = () => {
  const { embedUrl, loading, error, loadQAgent } = useQAgent();
  const containerRef = useRef<HTMLDivElement>(null);
  const embeddedQRef = useRef<any>(null);

  // Load Q agent embed URL on mount
  useEffect(() => {
    loadQAgent();
  }, []);

  // Refresh embed URL before expiration
  useEffect(() => {
    if (!embedUrl) return;

    const refreshTimer = setTimeout(() => {
      console.log('Refreshing Q agent embed URL...');
      loadQAgent();
    }, EMBED_URL_EXPIRATION - 60000); // Refresh 1 minute before expiration

    return () => clearTimeout(refreshTimer);
  }, [embedUrl]);

  // Embed Q agent when URL is available
  useEffect(() => {
    if (!embedUrl || !containerRef.current) return;

    const embedQ = async () => {
      try {
        // Clean up previous embed
        if (embeddedQRef.current) {
          containerRef.current!.innerHTML = '';
        }

        // Load QuickSight embedding SDK
        if (!window.QuickSightEmbedding) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/amazon-quicksight-embedding-sdk@2.7.0/dist/quicksight-embedding-js-sdk.min.js';
          script.async = true;
          document.body.appendChild(script);
          
          await new Promise((resolve) => {
            script.onload = resolve;
          });
        }

        // Embed Q agent
        const options = {
          url: embedUrl,
          container: containerRef.current,
          height: '700px',
          width: '100%',
          scrolling: 'no',
          className: 'q-agent-iframe',
        };

        embeddedQRef.current = window.QuickSightEmbedding.embedQSearchBar(options);

        // Handle Q agent events
        embeddedQRef.current.on('error', (event: any) => {
          console.error('Q agent error:', event);
        });

        embeddedQRef.current.on('load', () => {
          console.log('Q agent loaded successfully');
        });

      } catch (err) {
        console.error('Failed to embed Q agent:', err);
      }
    };

    embedQ();

    return () => {
      if (embeddedQRef.current) {
        containerRef.current!.innerHTML = '';
      }
    };
  }, [embedUrl]);

  if (loading) {
    return (
      <div className="q-agent-loading">
        <div className="spinner"></div>
        <p>Loading Q Agent...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="q-agent-error">
        <h3>Failed to Load Q Agent</h3>
        <p>{error}</p>
        <button onClick={loadQAgent} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="q-agent-container">
      <div className="q-agent-header">
        <h2>Ask Questions About Your Data</h2>
        <p>Use natural language to explore your analytics</p>
      </div>
      <div ref={containerRef} className="q-agent-embed" />
    </div>
  );
};
