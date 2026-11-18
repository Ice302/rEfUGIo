Bernoulli's Drop livery - painted on the Tiny Planes 747 templates (layout 1: side views, one sheet)
====================================================================================================

Files (one square texture per aircraft, same layout as the templates)
  B748I_livery_bernoullis_drop_4096.png   Boeing 747-8I, 4096 x 4096   (aircraft "Daniel", BD-03 - the one in the film)
  B748I_livery_bernoullis_drop.png        the same at 2048 x 2048
  B744_livery_bernoullis_drop_4096.png    Boeing 747-400, 4096 x 4096  (aircraft "Johann II", BD-05)
  B744_livery_bernoullis_drop.png         the same at 2048 x 2048
  *_check.png                             2048 previews with the template's guide laid over the paint
                                          (for checking only - don't use them as textures)

What is painted where
  Fuselage sides   Ink (#0b0d11) above the gold "Bernoulli line", Pearl (#ece6da) below it. The line sits
                   about 1.6 m below the main-deck windows, dips slightly behind the nose and sweeps up the
                   tail cone, with a gold double pinstripe (#c9a66b + #e6c890) along it.
                   Windows: dark glass with thin gold frames. Doors outlined. Cockpit glass with pearl frames.
                   "BERNOULLI'S DROP" titles (serif capitals, gold), the aircraft name in italics under the
                   cockpit, the registration near the tail. Every word reads the right way round on BOTH
                   sides - the two sides are painted separately, never mirrored.
  Fin              Ink, a gold rule along the leading edge, and the drop-and-ripple mark (a gold-to-pearl
                   drop over three gold ripples), upright on both sides.
  Engines          Ink cowls with the polished gold inlet ring at the front (the nose side of the sheet).
                   The back edge (chevron nozzle) is a single colour, as the template asks.
  Wings, tailplane Graphite (#34373e) with faint panel lines that follow the template's mesh lines.
                   747-8I: the raked wing tips carry a gold accent.
  Winglets (744)   Ink with a small gold drop.
  Belly fairings   Pearl.   Swatches: flap fairings and pylons graphite.
  Hidden (hatched) areas are painted too, so nothing shows if they peek out.

The colours, typefaces (Instrument Serif and Geist Mono, SIL Open Font License) and the mark are the ones
the Bernoulli's Drop website paints on its 3D 747. Bernoulli's Drop is a fictional airline.

To repaint (for example with another aircraft name or registration), from the bernoulli's drop project:
  node tools/paint-uv-livery.mjs --out <folder> [--name "Jacob" --reg "BD-01"] <template.zip> [<template.zip>]
The tool reads the template zips directly, finds every piece from the guide's red outlines, measures the
fuselage (scale, crown, belly, window row) and paints each piece inside its outline.
