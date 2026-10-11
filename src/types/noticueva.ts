export interface NotiCuevaPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  author: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  published: boolean;
}

export interface CreatePostInput {
  title: string;
  content: string;
  author?: string;
  imageUrl?: string;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  author?: string;
  imageUrl?: string;
  published?: boolean;
}

export interface EmbeddedTweet {
  id: string;
  url: string;
  authorName: string;
  handle: string;
  text: string;
  date: string;
  likes?: number;
  retweets?: number;
}
