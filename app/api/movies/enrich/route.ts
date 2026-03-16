import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { movies } = await req.json(); // Array of strings e.g., ["Inception", "Interstellar"]
    const apiKey = process.env.OMDB_API_KEY;

    if (!movies || !Array.isArray(movies)) {
      return NextResponse.json({ error: "Provide an array of movie titles" }, { status: 400 });
    }

    const enrichedMovies = await Promise.all(
      movies.map(async (title: string) => {
        // 1. Search OMDb for the exact movie title
        const searchRes = await fetch(
          `http://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${apiKey}`
        );
        const movieData = await searchRes.json();

        // 2. OMDb returns a "Response" string of "True" if it found the movie
        if (movieData.Response === "True") {
          return {
            title: movieData.Title,
            original_title: title, // Keep original AI title as fallback
            // OMDb returns the literal string "N/A" if there is no poster/rating
            poster_url: movieData.Poster !== "N/A" ? movieData.Poster : null,
            rating: movieData.imdbRating !== "N/A" ? movieData.imdbRating : null,
            release_date: movieData.Year,
            overview: movieData.Plot !== "N/A" ? movieData.Plot : "No description available.",
            imdb_id: movieData.imdbID
          };
        }

        // 3. Fallback if OMDb somehow doesn't find the AI's movie
        return { 
          title, 
          poster_url: null, 
          rating: null, 
          overview: "No description available." 
        };
      })
    );

    return NextResponse.json({ success: true, enrichedMovies });

  } catch (error) {
    console.error("OMDb Enrichment Error:", error);
    return NextResponse.json({ error: "Failed to fetch movie details from OMDb" }, { status: 500 });
  }
}