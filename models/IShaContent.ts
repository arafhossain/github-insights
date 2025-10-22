import { IFileData } from "@/pages";

export interface IShaContent {
  sha: string;
  node_id: string;
  commit: Commit;
  url: string;
  html_url: string;
  comments_url: string;
  author: IShaContentAuthor;
  committer: IShaContentAuthor;
  parents: {
    sha: string;
    url: string;
    html_url: string;
  }[];
  stats: {
    total: number;
    additions: number;
    deletions: number;
  };
  files: IFileData[];
}

interface Commit {
  author: CommitAuthor;
  committer: CommitAuthor;
  message: string;
  tree: { sha: string; url: string };
  url: string;
  comment_count: number;
  verification: Verification;
}

interface Verification {
  verified: boolean;
  reason: string;
  signature: string;
  payload: string;
  verified_at: string;
}

interface CommitAuthor {
  name: string;
  email: string;
  date: Date;
}

interface IShaContentAuthor {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  user_view_type: string;
  site_admin: boolean;
}
