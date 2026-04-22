export interface User {
  id: number;
  email: string;
  name: string;
  role: 'freelancer' | 'client' | 'admin';
  avatar: string;
  profileImage?: string;
  profile?: FreelancerProfile | ClientProfile;
}

export interface FreelancerProfile {
  bio: string;
  skills: string; // JSON string
  experience: string; // JSON string of Experience[]
  location: string;
  hourly_rate: number;
  designation: string;
  tagline: string;
  years_exp?: string;
  projects_count?: string;
  rating_status?: string;
}

export interface ClientProfile {
  bio: string;
  location: string;
  designation: string;
  total_investment?: string;
  projects_posted?: string;
  network_rating?: string;
}

export interface Experience {
  id: number;
  role: string;
  company: string;
  period: string;
  desc: string;
}

export interface PortfolioItem {
  id: number;
  freelancer_id: number;
  title: string;
  description: string;
  image_url: string;
  link?: string;
}

export interface Project {
  id: number;
  freelancer_id: number;
  client_id?: number;
  client_name?: string;
  title: string;
  description: string;
  status: 'in_progress' | 'completed' | 'overdue' | 'on_hold' | 'canceled' | 'pending';
  start_date: string;
  deadline: string;
  budget: number;
  progress?: number;
  notes?: string;
}

export interface ClientRecord {
  id: number;
  freelancer_id: number;
  name: string;
  email: string;
  company: string;
  notes: string;
}

export interface Review {
  id: number;
  authorId?: number;
  name: string;
  role: string;
  text: string;
  rating: number;
  image: string;
  featured?: boolean;
}
