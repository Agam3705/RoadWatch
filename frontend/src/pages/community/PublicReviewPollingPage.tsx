import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Vote, Star, CheckCircle2, MessageSquare, TrendingUp, BarChart3,
  Award, ThumbsUp, MapPin, Send, AlertCircle, Shield, Sparkles
} from 'lucide-react';

export const PublicReviewPollingPage: React.FC = () => {
  const { user } = useAuth();

  // Polls State
  const [polls, setPolls] = useState<any[]>([]);
  const [pollsLoading, setPollsLoading] = useState(true);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  // Feedback State
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState<number>(4.6);
  const [feedbackLoading, setFeedbackLoading] = useState(true);

  // Submit Feedback Form State
  const [starRating, setStarRating] = useState(5);
  const [feedbackCategory, setFeedbackCategory] = useState('ROAD_QUALITY');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackWard, setFeedbackWard] = useState('Ward 12');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const fetchPolls = async () => {
    try {
      const res = await api.community.polls();
      setPolls(res.items || []);
    } catch {
    } finally {
      setPollsLoading(false);
    }
  };

  const fetchFeedback = async () => {
    try {
      const res = await api.community.feedback();
      setFeedbacks(res.items || []);
      if (res.avg_rating) setAvgRating(res.avg_rating);
    } catch {
    } finally {
      setFeedbackLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
    fetchFeedback();
  }, []);

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) {
      alert('Please sign in or use a demo profile to cast your civic vote.');
      return;
    }

    setVotingPollId(pollId);
    try {
      await api.community.vote(pollId, optionId);
      await fetchPolls();
    } catch (err: any) {
      alert(err.message || 'Error recording vote.');
    } finally {
      setVotingPollId(null);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackComments.trim()) return;

    if (!user) {
      alert('Please sign in to submit citizen feedback.');
      return;
    }

    setSubmittingFeedback(true);
    setFeedbackSuccess(false);

    try {
      await api.community.submitFeedback({
        rating: starRating,
        category: feedbackCategory,
        title: feedbackTitle.trim() || `Citizen Rating: ${starRating} Stars`,
        comments: feedbackComments.trim(),
        ward: feedbackWard,
      });
      setFeedbackComments('');
      setFeedbackTitle('');
      setFeedbackSuccess(true);
      await fetchFeedback();
      setTimeout(() => setFeedbackSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Error submitting feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const totalVotesAcrossPolls = polls.reduce((acc, p) => acc + (p.total_votes || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-semibold">
            <Vote className="w-3.5 h-3.5" />
            <span>Civic Engagement & Accountability Polling</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Public Review Polling & Civic Feedback Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Empowering citizens to evaluate contractor repair quality, vote on quarterly road budgeting priorities, and shape municipal infrastructure decisions.
          </p>
        </div>

        {/* Satisfaction Metric Pill */}
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xl">
            ★
          </div>
          <div>
            <div className="text-xs font-bold text-slate-300 uppercase">Public Satisfaction</div>
            <div className="text-2xl font-black text-white">{avgRating} / 5.0</div>
            <div className="text-[10px] text-emerald-400 font-semibold">{totalVotesAcrossPolls} Civic Votes Cast</div>
          </div>
        </div>
      </div>

      {/* Quick KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Active Polling Topics</span>
            <Vote className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{polls.length}</div>
          <div className="text-[11px] text-slate-400">Quality reviews & budgeting</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Total Civic Votes</span>
            <ThumbsUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-600">{totalVotesAcrossPolls}</div>
          <div className="text-[11px] text-slate-400">Verified citizen ballots</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Citizen Reviews</span>
            <MessageSquare className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-indigo-600">{feedbacks.length}</div>
          <div className="text-[11px] text-slate-400">Public ratings & remarks</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Civic Approval Rate</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600">
            {Math.round((avgRating / 5) * 100)}%
          </div>
          <div className="text-[11px] text-slate-400">Compaction & repair index</div>
        </div>
      </div>

      {/* SECTION 1: ACTIVE COMMUNITY POLLS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Vote className="w-5 h-5 text-brand-600" />
              Active Municipal Review & Budgeting Polls
            </h2>
            <p className="text-xs text-slate-500">
              Cast your vote to guide municipal repair verification and seasonal asphalt resource allocation.
            </p>
          </div>
        </div>

        {pollsLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading civic polls...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {polls.map((poll) => {
              const totalVotes = poll.total_votes || 1;
              const hasVoted = Boolean(poll.user_voted_option);

              return (
                <div
                  key={poll.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                        {poll.category === 'REPAIR_QUALITY' ? 'Post-Repair Audit' : 'Municipal Budgeting'}
                      </span>
                      <span className="text-xs font-bold text-slate-400 font-mono">
                        {poll.total_votes || 0} votes
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 leading-snug">
                      {poll.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {poll.description}
                    </p>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2.5 pt-2">
                    {poll.options?.map((opt: any) => {
                      const optVotes = opt.votes || 0;
                      const pct = Math.round((optVotes / totalVotes) * 100);
                      const isSelected = poll.user_voted_option === opt.id;

                      return (
                        <button
                          key={opt.id}
                          disabled={votingPollId === poll.id}
                          onClick={() => handleVote(poll.id, opt.id)}
                          className={`w-full text-left p-3 rounded-2xl border transition-all relative overflow-hidden group ${
                            isSelected
                              ? 'border-brand-500 bg-sky-50/60 font-bold'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {/* Background Percentage Progress Fill */}
                          <div
                            className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ${
                              isSelected ? 'bg-sky-200/40' : 'bg-slate-100/60'
                            }`}
                            style={{ width: `${pct}%` }}
                          />

                          <div className="relative flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'border-brand-600 bg-brand-600 text-white'
                                    : 'border-slate-300 group-hover:border-slate-400'
                                }`}
                              >
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </span>
                              <span className="text-slate-800">{opt.label}</span>
                            </div>
                            <span className="font-mono font-bold text-slate-700 shrink-0">
                              {pct}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {hasVoted && (
                    <div className="pt-2 text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Your vote is officially registered in the municipal tally.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: CITIZEN FEEDBACK & REVIEW CENTER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
        {/* Left Form: Submit Feedback */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              Submit Civic Feedback & Review
            </h2>
            <p className="text-xs text-slate-500">
              Rate municipal road conditions, repair responsiveness, and contractor execution.
            </p>
          </div>

          {feedbackSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Feedback successfully submitted! Thank you for contributing.</span>
            </div>
          )}

          <form onSubmit={handleSubmitFeedback} className="space-y-3.5">
            {/* Star Selector */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Satisfaction Rating
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setStarRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= starRating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-slate-600 ml-2">
                  {starRating === 5
                    ? 'Excellent'
                    : starRating === 4
                    ? 'Good'
                    : starRating === 3
                    ? 'Average'
                    : starRating === 2
                    ? 'Poor'
                    : 'Substandard'}
                </span>
              </div>
            </div>

            {/* Category & Ward */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Category</label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none bg-white text-slate-800"
                >
                  <option value="ROAD_QUALITY">Road Quality</option>
                  <option value="REPAIR_SPEED">Repair Speed</option>
                  <option value="CONTRACTOR_CONDUCT">Contractor Workmanship</option>
                  <option value="CIVIC_TRANSPARENCY">Public Transparency</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Municipal Ward</label>
                <input
                  type="text"
                  placeholder="e.g. Ward 12"
                  value={feedbackWard}
                  onChange={(e) => setFeedbackWard(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">Review Title</label>
              <input
                type="text"
                placeholder="e.g. Clean asphalt finish on Ring Road"
                value={feedbackTitle}
                onChange={(e) => setFeedbackTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
              />
            </div>

            {/* Comments */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">Comments & Observations</label>
              <textarea
                rows={3}
                required
                placeholder="Share your experience regarding road smoothness, safety, or repairs..."
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={submittingFeedback || !feedbackComments.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Civic Review</span>
            </button>
          </form>
        </div>

        {/* Right Feed: Public Citizen Feedback */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-brand-600" />
                Live Civic Feedback Feed
              </h2>
              <p className="text-xs text-slate-500">Public transparency reviews submitted by local residents.</p>
            </div>
            <span className="text-xs font-bold text-slate-500 font-mono">
              {feedbacks.length} Reviews
            </span>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {feedbackLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading civic feedback...</div>
            ) : feedbacks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">No reviews logged yet.</div>
            ) : (
              feedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                        {(fb.user_name || 'C').charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{fb.user_name}</div>
                        <div className="text-[10px] text-slate-400">{fb.ward}</div>
                      </div>
                    </div>

                    {/* Stars */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= fb.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="font-semibold text-xs text-slate-800">{fb.title}</div>
                  <p className="text-xs text-slate-600 leading-relaxed">{fb.comments}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
