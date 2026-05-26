export type EssayBlock = { type: "h" | "p"; text: string }

export const ESSAY: EssayBlock[] = [
  {
    "type": "h",
    "text": "Introduction"
  },
  {
    "type": "p",
    "text": "This study examines the divide between two fundamentally different kinds of image: the human-captured photograph, produced through an embodied encounter between an observer and their environment, and the data-driven image, synthesised by what can be described as a ‘machine’s perception’: a statistically learnt understanding of the world based on algorithms trained on massive datasets. To investigate this difference, this study looks beyond the image itself to the stage prior to reproduction: perception. The central question is not the visual difference between the human-captured and data-synthesised image — as the two are increasingly indistinguishable from one another — but what the feelings each evokes, authenticity on one side and the uncanny on the other, reveal about the structural conditions under which each is produced"
  },
  {
    "type": "p",
    "text": "\"This study is written to be read alongside Core Memories, a live web experience — [link]. Where the design makes the argument felt, this study makes it defensible.\""
  },
  {
    "type": "h",
    "text": "Incorrection to the project"
  },
  {
    "type": "p",
    "text": "This study is one of three outcomes produced in response to this question. Core Memories — an interactive web experience that places a user’s own memories into a generative AI pipeline, returning them as synthesised images within a photo album — constitutes the primary practice-led investigation. A critical report on the design process and research journey constitutes a third. This study supplies the theoretical, ethical, and contextual depth that the design compresses into a single interaction, and is intended to be read in conjunction with it: where the design makes the argument felt, this study makes it defensible."
  },
  {
    "type": "h",
    "text": "Background – Primary and Secondary Research"
  },
  {
    "type": "p",
    "text": "Primary research conducted for this study reveals that the experience of AI-generated imagery is already one of overwhelming volume. One respondent described feeling “bombarded with so much at such a fast pace” that they had “become indifferent to their rapidly growing realism”. These responses are not isolated. Recent reports confirm that over 71% of social media imagery is now AI-generated (Marr, 2025), with this figure increasing daily. This is a transition described as a ‘race to the bottom’, characterised by ‘content fatigue’ and the algorithmic phenomenon of ‘brain rot’ (Yalcinkaya, 2025), driven by the constant influx of AI-generated content, or ‘slop’, infiltrating every corner of our current media landscape."
  },
  {
    "type": "p",
    "text": "While recent advancements in generative AI mean machine-synthesised images appear visually indistinguishable from human-captured ones, reactions remain adverse. The dominant pattern emerging from the primary survey was not aesthetic dissatisfaction but a ‘trust deficit’ and ‘uncanny-ness’: a sense of unease that occurs specifically when the procedural origin of an image is revealed to be data-synthesised. This unsettlement has a long theoretical precedent within the discussion of images: Susan Sontag argued that photographs function as evidence of lived presence, a material trace of an encounter between observer and world (On Photography, 1977), while Roland Barthes identified photography’s defining quality as what he termed the noeme, the “that-has-been”: the certainty that what is depicted actually existed in front of a lens at a specific moment in time, giving images an “essential unit of meaning” (Camera Lucida, 1980)."
  },
  {
    "type": "p",
    "text": "It is precisely this contract that AI-generated imagery breaks. One respondent described feeling “deceived because I’m used to thinking of photography as a type of ‘truth’”, identifying that implicit agreement as the source of their unsettlement. Another asked: “What’s the meaning of an AI-made picture of me on top of mountains if I didn’t experience breathing in that air and feeling the wind on my face and the smell of the grass?” — describing the relationship between subject, creator, and environment that underpins an authentic image, or in other words, what Barthes coined as the noeme."
  },
  {
    "type": "p",
    "text": "This response summarises the procedural difference between how data-driven imagery is received in comparison to human-captured imagery, and why that difference exists. If the visual output is identical, yet the response differs so drastically, the independent variable must occur at a stage prior to the final image. In the AI generation process, ‘emotion’ is merely organised metadata. Human perception, in contrast, is not explicitly learnt but is experienced and felt, shaped by active memory and an ecological association with the world (Gibson, 1979)."
  },
  {
    "type": "h",
    "text": "Theoretical Frameworks: Ecological Affordances vs. Information Theory"
  },
  {
    "type": "p",
    "text": "To illustrate these differing mechanisms of perception, I draw upon two foundational but conflicting models: James J. Gibson’s Ecological Approach to Visual Perception (1979) and Claude Shannon’s Information Theory (Shannon and Weaver, 1949). Gibson defines perception as contingent upon the physical environment, the senses, and the ‘ceaseless and unbroken’ pickup of information, an active encounter with the world rather than a passive reception of signals. Central to this framework is the concept of ‘affordances’: the relational properties between an observer and their environment, such as how a surface affords sitting or how a scene affords nostalgia (p. 229). Under this model, human perception exists within a continuous narrative of time, action, and sensation."
  },
  {
    "type": "p",
    "text": "Shannon’s model operates on an entirely different logic: it treats the world as quantified, discrete signals to be predicted rather than experienced, measuring information by its probability within a transmission system. Crucially, it is this model of communication that has shaped the architectural development of Artificial Intelligence, providing the mathematical language for measuring information, compressing data, and managing uncertainty. The two models therefore describe fundamentally different relationships with the world: one rooted in ecological experience, the other in algorithmic probability."
  },
  {
    "type": "p",
    "text": "This divide is made concrete when applied to something as ordinary as a chair. A human perceives it as a ‘sittable’ object anchored by subjective memory and bodily experience, an affordance. A machine perceives that same chair as a specific mathematical relationship between coordinates in a high-dimensional vector space. The visual output of each process may be alike, but the underlying mechanisms diverge, with this conflict a probable cause of the ‘uncanny’ effect: not a failure of visual quality, but an absence of ecological affordances within a reality reconstructed through latent geometry. Notably, respondents in the primary survey arrived at this same conclusion without the theoretical framework to name it. One described the experience of AI-generated imagery as carrying “no back-story, no context and no past or present”, characterising it as “a snapshot of a currently described and static world” that “carries less meaning”, articulating in lay terms precisely the ecological absence Gibson’s model would predict."
  },
  {
    "type": "h",
    "text": "Theoretical Frameworks: Teleology"
  },
  {
    "type": "p",
    "text": "This structural absence of lived experience is not confined to visual synthesis. It extends to all forms of generative media, producing what has become colloquially termed ‘word soup’, the linguistic equivalent of ‘image slop’: outputs that are probabilistically coherent but ecologically empty, appearing as signals that lack a narrative anchor. This phenomenon was theoretically predicted by Shannon himself in his 1956 paper “The Bandwagon”, in which he explicitly cautioned against the over-extension of Information Theory into fields like psychology, linguistics, and now creative practices like image-making, warning that his mathematical framework was designed solely for the efficiency of signal transmission, not for the creation of semantic meaning (Shannon, 1956)."
  },
  {
    "type": "p",
    "text": "The fact that this same framework now informs the architecture of modern Artificial Intelligence — such as semantic image segmentation, achieved through deep neural networks based on principles derived from Shannon’s information theory via information measures (entropy) — is central to understanding the ‘uncanny’ effect. When a system built for managing uncertainty and signal probability is applied to tasks that are inherently conditional on lived experience, a conflict occurs. Image generation technology is optimised for the most mathematically probable arrangement within a latent space, yet it remains disconnected from the ecological environment that gives such arrangements meaning. One respondent captured the consequence of this structural disconnect: “There’s beauty in both happiness and suffering, in love and pain, in life and death; there can’t be beauty in something that never took place.” This is not an aesthetic objection but an ontological one, and it mirrors exactly what Shannon’s own caution predicted: that a system designed for signal efficiency cannot generate the ecological meaning an audience expects from an image. The ‘uncanny’ or the ‘slop’ observed in generative outputs is therefore not a flaw in the technology, it is symptomatic of its design teleology; the purpose and ends towards which the system was engineered, oriented toward the calculation of probability rather than the resonance of physical experience. This outlines the argument that the origins of the “uncanny-ness” associated with AI-generated images is a structural one, not a visual one."
  },
  {
    "type": "h",
    "text": "Application of Theoretical Frameworks"
  },
  {
    "type": "p",
    "text": "This distinction has direct consequences for how we think about the application of AI technology, particularly in contexts where meaning and authenticity constitute the primary purpose of a given output, such as the image. By distinguishing between the teleology of a human observer behind a lens and that of a prompt-driven machine, we can establish a clear logic for their respective applications: identifying where generative affordances are well-suited, and where narrative-driven capture remains essential."
  },
  {
    "type": "p",
    "text": "Authenticity, on this account, is not a visual property to be synthesised — it is a procedural outcome of lived connection between a subject, creator, and their environment. The choice of medium must therefore be dictated by whether the intended message requires the scalable calculations or the ecology embedded in experience. This is the operative framework this design investigation seeks to make tangible: not simply to diagnose the problem of ‘slop’, but to investigate how interaction design can expose where it occurs and in doing so, locate more considered and mindful applications for AI within a creative practice."
  },
  {
    "type": "h",
    "text": "Methodological Frameworks: Theory to Interaction Design"
  },
  {
    "type": "p",
    "text": "To investigate this procedural divide, this study adopts a dual methodological framework that moves from theoretical context to active material intervention."
  },
  {
    "type": "p",
    "text": "Grounded in Media Ecology, I draw upon Marshall McLuhan’s (1964) notion that “the medium is the message”. In the context of 2026, the “message” of AI is not the specific image it produces, but the statistical, data-driven process that creates it. By shifting focus away from visual content and toward the medium itself, this study examines how the ontology of the image changes when it moves from a record of a lived moment to a synthesis of data, allowing for a direct comparison between the “message” of human perception, rooted in ecological experience, and the “message” of machine perception, rooted in algorithmic probability."
  },
  {
    "type": "p",
    "text": "However, according to Tim Ingold’s school of thought, to truly understand the ontology of data-driven image-making, the logic of the medium must be experimented with on a material level. This is where the “Thinking Through Making” methodology (Ingold, 2013) completes the practical design approach, guided by the idea that knowledge is generated through active engagement with materials rather than through theoretical analysis alone. In this study, those materials are the hidden layers of the digital age: web development languages such as Next.js, Three.js, HTML and CSS, as well as the AI models themselves — FLUX, Gemini 2.5 and Claude Haiku — the very same materials the design response is built with."
  },
  {
    "type": "p",
    "text": "The choice of the photo album as the design format for Core Memories follows directly from this methodological position. Feedback from peers and tutors revealed audiences responded more meaningfully to personal and sentimental framings of the enquiry than to technical or diagrammatic ones. This clarified the purpose of interaction design within the context of a teleological question: making a technical enquiry into something that could be directly experienced. By using the photo album as a personal site at which most people encounter images — a format already saturated with memory, affect, and the expectation of lived authenticity — and routing a user’s own memory through a generative AI pipeline and returning it within that format, the gap between ecological and informatic perception becomes something the user can feel in their own response, rather than observe from outside it. If, as Ingold argues, knowledge is generated through material engagement rather than observation alone, then the design response must enact the condition it is investigating, not merely describe it."
  },
  {
    "type": "h",
    "text": "Adoption of Design Approach in a Critical Investigation"
  },
  {
    "type": "p",
    "text": "The effective application of interactive designs that enable their users to engage with a subject or technology directly is not only something suggested by Ingold’s methodology but is something that can be clearly evidenced by key creative technologist practitioners, further supporting the design approach of this enquiry."
  },
  {
    "type": "p",
    "text": "A foundational reference for this approach is Bjørn Karmann’s Paragraphica (2023), a project that uses design practice to investigate the nature of data-to-image technology through direct user interaction. Paragraphica is a context-to-image camera turning geographical metadata into an image. Operating through open APIs, the device collects the address, weather, time of day, and nearby places of its current location, synthesises these data points into a descriptive paragraph, and then converts that paragraph into a “photo” using a text-to-image AI. The resulting image is not a snapshot but, as Karmann describes it, “a visual data visualisation and reflection of the location you are at”, and perhaps more significantly, a window into how the AI model itself “sees” that place (Karmann, 2023)."
  },
  {
    "type": "p",
    "text": "What makes Paragraphica particularly relevant to this enquiry is not the images it produces, but the interaction through which it produces them. The device is designed as a physical camera object; by mapping the hidden parameters of the machine onto the familiar material grammar of analogue photography, Karmann makes the data-driven logic of image synthesis physically tangible — something Core Memories aimed to achieve with the photo album format. The viewfinder, crucially, does not show an optical view of the world: it displays the text description the machine has composed. This is a direct materialisation of the procedural divide this study investigates: the moment at which ecological perception is replaced by information processing, rendered as a physical interactive experience."
  },
  {
    "type": "p",
    "text": "Karmann’s own account of the results confirms the central argument of this enquiry. He notes that the images “do capture some reminiscent moods and emotions from the place but in an uncanny way, as the photos never really look exactly like where I am” (Karmann, 2023). Along with material intervention, this project supports the theoretical position argued here: that the ‘uncanny’ is not a visual deficiency but a symptom of ecological absence. In making this gap not just observable but directly experienced, Paragraphica functions as both a design artefact and a critical instrument — shared aims of Core Memories."
  },
  {
    "type": "p",
    "text": "Where Karmann’s project externalises machine perception to make it visible, Kaloyan Kolev’s Reframe (2026) takes the opposite but complementary position, a secondary core reference in the design approach. Reframe reasserts the conditions of human perception by reintroducing friction into the act of capture itself. Kolev’s physical camera artefact resists the instantaneous logic of both smartphone photography and AI generation by forcing the user to slow down, to deliberate, and to be present. The resulting output is thus an intentional encounter between subject and observer, preserving what can be described as the ‘poetic truth’ and sentimental value inherent in human-captured imagery. In contrast to the optimised efficiency of AI image synthesis, Reframe treats the temporal and physical conditions of capture not as obstacles to overcome but as the very source of an image’s meaning. Kolev’s work therefore operates as a design argument in material form: that the ecological affordance relationship between a subject and their environment is not incidental to an image’s authenticity — it is contingent on it."
  },
  {
    "type": "p",
    "text": "Taken together, Karmann and Kolev describe a design spectrum through which the central problem of this enquiry can be approached: one end makes machine perception tactile and transparent; the other recuperates the conditions of lived, ecological image-making. Both use design practice not to produce visual outputs but to generate critical knowledge, enacting exactly Ingold’s principle that understanding emerges through material engagement rather than observation alone."
  },
  {
    "type": "h",
    "text": "Critical Application of Methodologies: Prototypes"
  },
  {
    "type": "p",
    "text": "The Thinking Through Making methodology can be mapped in the early prototypes of this investigation: the Computer Vision versus Human Labelling Test and the Human Semantic Grouping test (Schema), which function as material tests investigating the procedural divide between human and machine perception. As Ingold (2013) argues, to know a thing, one must follow its “traces”; in this enquiry, those traces were followed through the creation of interactive and participatory interventions designed to deconstruct the differing processes behind machine and human image-making in a side-by-side format."
  },
  {
    "type": "p",
    "text": "This transition into material practice began with a direct “correspondence” with the layers of computer vision and generative technology. In the first experiment, the act of “seeing” was isolated by remixing Google Creative Lab’s visualiser to create a dual-play environment where a computer vision model applied real-time, data-driven labels to video footage while an adjacent screen prompted human users to label the same scenes. By documenting these dual outputs, the system exposed a stark “procedural divide” and linguistic contrast between the two. While the machine generated an inventory of isolated nouns, identifying a “rock” or “person” based purely on statistical probability, human participants instinctively provided an ecological narrative, applying sensory context and relationships such as “comfort” or “relaxing in the sun”."
  },
  {
    "type": "p",
    "text": "Building on this, Schema maps the technical synthesis of these differing origins by holding the machine’s “geometric truth” against the user’s subjective semantic frameworks — in other words, “poetic truth”. This was achieved by developing a game-like interface where an AI model (CLIP) encodes images into high-dimensional embedding vectors within a shared latent space, calculating similarity as the cosine distance between those learned representations, clustered using K-Means. By allowing users to physically “wire” their own connections based on intuition and memory, and then testing them against the machine’s spatial logic, the prototype reveals where the “uncanny” resides in the gap between universal geometry and individual truth."
  },
  {
    "type": "h",
    "text": "Synthesised Outcome: Design as Idea Illustration"
  },
  {
    "type": "p",
    "text": "These prototypes established the theoretical divide between machine and human perception in controlled, side-by-side conditions. Core Memories advances this by making that divide personally felt, directed toward an audience who have encountered AI-generated imagery without the framework to understand where the uncanny derives from. The shift from a more technical dissemination to a user-centred, personal experience was not an aesthetic decision — it was a methodological one, arrived at by working backwards from a clear intention: that the audience should not be told about the ecological absence in AI-generated imagery, but should notice it through their own emotional reaction."
  },
  {
    "type": "p",
    "text": "The photo album was chosen as the container for this experience because it is the site at which almost everyone, regardless of their familiarity with image theory or AI technology, encounters images with genuine feeling. Family albums carry the weight of lived time; they are already a technology for storing memory, affect, and the evidence of experience. To use that format as the frame for synthetic memory creates a specific and immediate dissonance — one that does not need to be explained because it is already felt before the user has the language to name it. Showing early stages of the work to peers and tutors across the course confirmed this; responses were consistently stronger when the enquiry was framed personally and poetically rather than technically. People responded to it in a way that a diagram of a neural network or a side-by-side comparison could not provoke."
  },
  {
    "type": "p",
    "text": "The pipeline through which Core Memories operates mirrors, in reverse, the process by which convolutional neural networks build perception. When a user inputs a personal memory — “me and my brother and cousins set up a badminton net to play with at night in Italy” — a prompt-engineered AI interprets that recollection not as a felt experience but as a set of visual metadata: smoke, terracotta, a dark night sky, grass. These are the object and textural classifications that correspond to the softmax stage of a CNN’s convolution tunnel — the point at which lived, sensory specificity is reduced to the most statistically probable visual descriptors. A second AI then uses this metadata to generate the image. What the user receives is therefore not a synthesis of their memory but a synthesis of what their memory, processed through the machine’s classificatory logic, looks like from inside a latent space. The image is not wrong. It simply has no access to the experience it is reconstructing."
  },
  {
    "type": "p",
    "text": "Before the generated image is revealed, users are shown an intermediate output: the AI’s own account of the associations it made, briefly explaining that it produces these connections based on statistical patterns across many similar descriptions. This moment — where the machine articulates its own process in plain language — functions as a small but deliberate transparency mechanism, making the informatic logic visible at the point where it diverges most sharply from the user’s own recollection. This is engineered using the prompt: ‘Describe the associations you make of the memory input into visual cues that could be textures or objects. Briefly describe how you make those associations’ — leaving room for the AI to reveal something true about how it understands the world without mediating the response with too much control. A further feature allows users to hover over the generated image to see how a vision model describes it, revealing the vocabulary the machine builds from input to output and completing the circuit between the user’s original memory and its informatic reconstruction."
  },
  {
    "type": "p",
    "text": "The generated images are displayed in a photo album built with Three.js and rendered using a LoRA trained on images taken with a Sony Mavica, resembling the visual language of family albums from the 2000s. Much of this pipeline remains necessarily opaque to a general audience, and these small interventions — the interpretation text, the CNN visualiser, the vision model hover — are designed to partially address that opacity without overexplaining it. The theoretical insight is not delivered but discovered: the user arrives at it through the friction between their own mental image of the memory and the output it produced. In this sense, using AI as both the subject and the medium of the enquiry is a condition the design investigation is acutely aware of. Making a work about AI-generated imagery using AI generation is not unlike writing a book about books: the risk is self-referentiality; the opportunity is that the material demonstrates its own argument."
  },
  {
    "type": "p",
    "text": "In doing so, Core Memories acts as evidence for an answer to the central enquiry: that interaction design can investigate the divide between human-captured and data-driven imagery not by displaying that divide as a visual comparison, but by making the user an active participant in producing it. When the input is personal and the output is informatic, the uncanny — that felt sense of absence and authenticity — becomes something the user can locate, name, and critically engage with."
  },
  {
    "type": "h",
    "text": "Audiences: Creator and Consumer"
  },
  {
    "type": "p",
    "text": "Core Memories demonstrates that a practice-led approach giving agency to users is not merely a visual design tool — it is a necessary means for surfacing the broader condition this study seeks to address: that to research, develop, or apply generative AI within semantically driven contexts without reflecting on its teleological consequences is to risk its continued misuse. In other words, it is to risk the continued production of ‘slop’, with those exposed to its influx into mainstream media most negatively impacted."
  },
  {
    "type": "p",
    "text": "Much of this investigation was motivated not only by discourse concerning AI media amongst peers, as documented through the primary survey, but by a broader discourse emerging from within the tech industry itself. Leading figures including Yann LeCun, Meta’s Chief AI Scientist, have publicly acknowledged that current generative AI systems lack any grounding in physical or lived experience (LeCun, 2025) — the very absence this study seeks to make observable. Positioned within what Sharma (2026) describes as the “whistleblower” discourse — a growing body of critical voices from within the industry calling attention to the ethical consequences of its own outputs — this study does not seek to reject generative AI outright, but to hold a mirror to its ontological consequences within the context of images."
  },
  {
    "type": "p",
    "text": "The responsibility underpinning this enquiry is inseparable from its audience. While this investigation was informed by dialogue with the two groups at the centre of this shift — the technologists engineering these systems and the creative practitioners under pressure to adopt them — the primary audience of the design itself is its unwilling or unknowing consumers. It is consumers who ultimately drive the markets this technology is built to serve and yet have the least access to frameworks for understanding why the imagery saturating their feeds feels so uncanny. This study therefore directs its design response toward making that invisible condition legible."
  },
  {
    "type": "p",
    "text": "To develop this critical context, the investigation engaged directly with the groups responsible for this technological shift. By sharing progressive stages of the work across public forums like LinkedIn and reaching out to developers at the edge of this technology for informal interviews, the study observed how industry insiders responded to a design-led investigation of data-driven media and what their internal dialogues indicate about our changing media landscape. Responses from practitioners such as Alexander Chen (Creative Director, Google Creative Lab) and technologists at DeepMind suggested that a practice-led approach is essential for revealing the inner workings of the “black box”. As Leonardo Giusti (Chief Design Officer at Archetype AI) noted, design plays a vital role in “discovering the affordances of AI models as relational properties between the technology and the people who use it” — a core objective of this study."
  },
  {
    "type": "p",
    "text": "Furthermore, the concerns expressed by these figures reinforce the urgent need for a comprehensive analysis of AI’s best-use cases within creative applications. One anonymous respondent from a leading international AI development company highlighted the industry-internal critique of “enshittification” — a term coined by Cory Doctorow describing the process whereby once-useful tools are so aggressively monetised and algorithmically optimised that their original value to the user is lost. Within the context of this research, this concept extends beyond platform decay to the “enshittification” of visual culture itself. The respondent expressed concern that if AI-generated imagery is normalised without a robust critical framework, we risk a systemic trade-off in which authentic, lived experience is permanently replaced by synthetic, data-driven ‘slop’."
  },
  {
    "type": "h",
    "text": "A (Lack of) Ethical Framework"
  },
  {
    "type": "p",
    "text": "The dominant ethical model within the tech industry is one of harm reduction: a framework oriented toward managing the damage of a practice rather than questioning whether the practice is appropriate in the first place. Cody Turner’s Principle of Choosing Less Harmful Alternatives (PCLHA) offers a more demanding counter-position: that it is morally wrong to continue a practice that causes harm when an affordable, accessible, and functionally equivalent less harmful alternative exists (Turner, 2025). In this context, the “harm” in question is the erosion of user trust and the degradation of visual culture, as cited responses gathered in the primary research indicate. The “alternative” is a more considered application of medium to message. By adopting PCLHA, the use of AI within image-making processes moves from merely managing the ‘uncanny’ to actively questioning whether a data-driven medium is the most responsible choice for the intended message — a shift from harm reduction to harm prevention."
  },
  {
    "type": "p",
    "text": "Parallel research conducted with creative practitioners revealed the economic pressures driving the technology’s adoption at industry level. Discussions with an international creative agency made the scale of this pressure tangible: one participant noted that when comparing the cost of an AI-assisted production against a traditional editorial budget, the figures were “incomparable” (Personal communication, 10 March 2026). A case study of this tension can be found in the public backlash to Gucci’s SS26 campaign (McMahon, 2026): although intended as a provocation to spark conversation about technology’s role in fashion, the audience largely missed the provocation, with comments and press coverage focusing not on the conceptual gesture but on the perceived erasure of the brand’s values, with critics citing the substitution of Italian craft and embodied making with what The Courier described as a betrayal of “Italian craftsmanship” (The Courier, 2026). The audience’s response was not primarily aesthetic — it was ontological. What they resisted was the substitution of lived human process with synthetic efficiency: precisely the condition PCLHA would factor, where harm reduction logic permitted the switch on grounds of visual equivalence, while a more demanding ethical framework would have identified it as inappropriate in that specific authenticity-driven context."
  },
  {
    "type": "p",
    "text": "Together, these research encounters confirm that the central problem is not a lack of technical capability but a lack of critical and ethical framework — and that its consequences fall hardest on those consuming the technology rather than building it: the very audience this study places at its centre."
  },
  {
    "type": "h",
    "text": "Positionality: A Situated Practice"
  },
  {
    "type": "h",
    "text": "Theoretical Grounding"
  },
  {
    "type": "p",
    "text": "The critical lens used while engaging with technology as a medium within this practice is rooted in feminist theories that predate the modern internet, whose notions only become more relevant with each development in AI, clarifying why the pathologies emerging in our current media landscape exist. Ursula K. Le Guin’s Carrier Bag Theory of Fiction (1986) and Donna Haraway’s Cyborg Manifesto (1985) are two theorists central to this enquiry, justifying the reasons for engaging with technology as a medium creatively and as a subject of critical investigation."
  },
  {
    "type": "p",
    "text": "Le Guin argues that the first human tool was not the spear — an instrument of domination, conquest, and linear efficiency — but the carrier bag: a container for gathering, holding, and sharing. Applied to the ontological shift between images that this study investigates, the dominant logic of data-driven imagery operates precisely as a spear: standardised, scalable, and oriented toward economic efficiency, optimising for probability and reach at the expense of authenticity. The applied use of computational tools in Core Memories functions as a carrier bag by contrast, or within the sub-practice of creative computing, as ‘soft computing’. The work is designed to point out what generative imagery misses that ultimately impacts the “poetic truth” of an image, by re-purposing computation as a tool to guide a user through this realisation."
  },
  {
    "type": "p",
    "text": "Haraway’s Cyborg Manifesto extends this framework by acknowledging that the boundary between human and machine is already dissolved — that we are already integrated with our media ecology. Rather than resisting this condition, this practice seeks to interrogate it: to make the integration visible, tactile, and therefore critically legible by offering an experience to explore generative AI in a more intentional way. Together, these two texts form not just the ideological foundation of this practice but its moral compass — the basis from which to assess where computation serves human experience, and where it erodes it."
  },
  {
    "type": "h",
    "text": "Community of Practice"
  },
  {
    "type": "p",
    "text": "These are not simply theoretical positions held in a vacuum. They describe a practice that already exists at a professional level, enacted by figures whose work has most directly shaped the understanding of what it means to operate critically as a creative technologist within this landscape."
  },
  {
    "type": "p",
    "text": "Mindy Seu is one of the most precise embodiments of contemporary cyberfeminism. Her lecture performance A Sexual History of the Internet (2025) is particularly relevant: the performance script runs simultaneously on the individual iPhones of every audience member, synchronising hundreds of voices into what Seu describes as a “polyvocal performance of re-citation”. With Seu’s approach, Haraway’s insistence on making the human-machine integration legible becomes a live event, experienced by an audience in real time through the very devices that embody the condition she is interrogating — the same approach Core Memories takes to its critical enquiry and choice of medium."
  },
  {
    "type": "p",
    "text": "Tina Tarighian, Creative Technologist at Google Creative Lab, represents a different but equally formative influence: a practitioner who works from within computational systems with an insistence on authorial presence and human intention in the applied use of AI. Her project VeoVJ (2025) takes Google Veo’s generative outputs and, by programming and performing them in real time against music, transforms data synthesis into an authored, embodied experience. What might otherwise exist as unmediated output becomes, through her live coding, a generative performance with human intervention. What Tarighian’s practice confirms is that the problem this enquiry diagnoses is not a reason to reject generative tools, but a reason to insist on the conditions under which they are used — whereby authorial presence is not incidental to authentic output, but its entire substance."
  },
  {
    "type": "p",
    "text": "These are not simply theoretical positions held in a vacuum. The principle they share — that authorial presence and friction are not obstacles to working with computational tools but the entire substance of doing so meaningfully — is the same principle that governs the design decisions of Core Memories: using the medium being investigated as the medium of investigation, and insisting on human intention at every stage of the generative pipeline."
  },
  {
    "type": "h",
    "text": "Conclusion"
  },
  {
    "type": "p",
    "text": "This enquiry began with a question about images — the difference between those generated by a machine and those taken by a person. Through practical intervention, primary research, and the study of relevant theories and design methodologies, it arrived not at a visual comparison between the two, but at the ethical and critical framework now necessary for navigating a world in which any lived moment can be statistically reconstructed by a machine. The central investigation — how interaction design can expose the divide between human-captured and data-synthesised imagery — was answered not through side-by-side images, but through the friction of personal experience: by placing a user’s own memory into the logic of a generative system, and allowing the resulting gap between what is felt and what is synthesised to speak for itself."
  },
  {
    "type": "p",
    "text": "What Core Memories makes visible is not a failure of technology. The ‘uncanny’ this study has traced is a structural consequence of applying a system designed for signal efficiency — Shannon’s Information Theory — to tasks inherently conditional on lived, ecological experience, where an audience’s expectation of authenticity is met instead with the most probable statistical synthesis within a latent space. This is the absence of affordance: the relational, ecological properties that Gibson argues are not learnt but experienced. The images produced by generative AI are not therefore ‘wrong’. They are simply the output of a system that was never designed to know what it feels like to stand somewhere, to carry a memory, or to mean something. Or, as one respondent put it, “to breathe in that air.” When that system is asked to synthesise authenticity, the absence becomes perceptible not visually, but ontologically — in the knowledge that the moment being depicted never actually occurred."
  },
  {
    "type": "p",
    "text": "McLuhan’s provocation that “the medium is the message” gives this structural absence its cultural consequence. The ‘message’ of AI is not the specific image it generates; it is the probability-optimised process that generates it — an engineered depiction of life in place of a lived one. A process that, as Shannon forewarned, was never designed to carry semantic meaning, let alone the “poetic truth” in a situation where people expect authenticity. When that architecture is applied at scale, shaping the visual landscape of social media, advertising, and creative practice, the result is not simply an aesthetic shift but a cultural erosion: what the tech industry has termed ‘enshittification’, extended here from platform decay to visual culture itself, and framed by this study not as technical inevitability but as ethical failure — one whose consequences fall most heavily on those consuming the outputs."
  },
  {
    "type": "p",
    "text": "The practice-led methodology adopted in this investigation, guided by Ingold’s principle that knowledge is generated through material engagement rather than observation alone, proved essential in moving this argument from theoretical to tangible understanding. Through the Computer Vision versus Human Labelling prototype and Schema prototype, the procedural divide between machine and human perception was made materially explicit. Core Memories extended this from a controlled test into a personal encounter, using the photo album not as an aesthetic choice alone, but as a format that carries the weight of senses, memory, and time — qualities that no latent space can fully reconstruct."
  },
  {
    "type": "p",
    "text": "The broader positionality of this practice is not incidental to its conclusions. Le Guin’s carrier bag theory and Haraway’s dissolved boundary between human and machine do not simply provide an ideological lens to the approach of this enquiry — they define the ethical stakes of a creative technologist practice in this moment. The question is not whether to engage with generative tools but under what conditions, and toward whose benefit. Figures like Tarighian and Seu demonstrate that authorial presence and critical intention are not obstacles to working with AI; they are the entire substance of doing so meaningfully."
  },
  {
    "type": "p",
    "text": "What this study ultimately argues is that the most pressing gap in our current media landscape is not a technical one. It is the absence of a critical framework available to those developing and deploying AI technologies, and, arguably more importantly, to those consuming the outputs. If the production and normalisation of ‘slop’ is governed by harm reduction logic — permitting synthetic substitution on grounds of visual equivalence — the erosion of trust, authenticity, and visual culture will continue."
  },
  {
    "type": "p",
    "text": "Core Memories does not resolve this condition, but it offers a model for how interaction design can make the condition legible, and in doing so, place the tools for critical engagement into the hands of those navigating our current media landscape."
  }
]
