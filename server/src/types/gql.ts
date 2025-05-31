export interface ChannelVideoCoreResponse {
  data: {
    video: {
      id: string;
      owner: {
        id: string;
        login: string;
        displayName: string;
        primaryColorHex: string | null;
        profileImageURL: string;
        stream: unknown;
        __typename: string;
        channel: unknown;
      };
      __typename: string;
    };
  };
  extensions?: unknown;
}

export interface VideoMetadataResponse {
  data: {
    user: {
      id: string;
      primaryColorHex: string | null;
      isPartner: boolean;
      profileImageURL: string;
      lastBroadcast: unknown;
      stream: unknown;
      followers: unknown;
      __typename: string;
    } | null;
    currentUser: unknown;
    video: {
      id: string;
      title: string;
      description: string | null;
      previewThumbnailURL: string;
      createdAt: string;
      viewCount: number;
      publishedAt: string;
      lengthSeconds: number;
      broadcastType: 'ARCHIVE' | 'HIGHLIGHT' | 'UPLOAD' | 'PREMIERE_UPLOAD' | 'PAST_PREMIERE';
      owner: {
        id: string;
        login: string;
        displayName: string;
        __typename: string;
      };
      game: unknown;
      __typename: string;
    };
  };
  extensions?: unknown;
}

export interface PlaybackAccessTokenResponse {
  data: {
    videoPlaybackAccessToken: {
      value: string;
      signature: string;
      __typename: string;
    };
  };
  extensions?: unknown;
}
