import { AudioLines, Upload, ArrowRight } from "lucide-react";
import { useMusic } from "../store";
export function EmptyCatalogue() {
  const m = useMusic();
  return (
    <section className="catalogue-welcome">
      <div className="catalogue-symbol">
        <AudioLines size={55} />
      </div>
      <span className="eyebrow">YOUR NEXT FAVOURITE SOUND</span>
      <h1>
        {m.isAdmin
          ? "Your first release starts here."
          : "Good music is on its way."}
      </h1>
      <p>
        {m.isAdmin
          ? "Your cloud catalogue is connected. Upload your first song and advert from the studio to start welcoming listeners."
          : "The artists are getting ready. Check back soon for the first releases on Horicx Music."}
      </p>
      {m.isAdmin ? (
        <a className="button lime" href="#/admin">
          <Upload size={17} />
          Open admin studio
        </a>
      ) : (
        <button
          className="button secondary"
          onClick={() => m.setAuthOpen(true)}
        >
          Sign in <ArrowRight size={16} />
        </button>
      )}
    </section>
  );
}
