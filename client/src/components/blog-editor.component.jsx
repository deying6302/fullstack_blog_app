import { Link } from "react-router-dom";
import logo from "../imgs/logo.png";
import AnimationWrapper from "../common/page-animation";
import defaultBanner from "../imgs/blog banner.png";
import { uploadImage } from "../common/aws";
import { useContext, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import { EditorContext } from "../pages/editor.pages";
import EditorJS from "@editorjs/editorjs";
import { tools } from "./tools.component";

const BlogEditor = () => {
  const {
    blog,
    blog: { title, banner, content },
    setBlog,
    textEditor,
    setTextEditor,
    setEditorState,
  } = useContext(EditorContext);

  useEffect(() => {
    const editorInstance = new EditorJS({
      holderId: "textEditor",
      data: content,
      tools: tools,
      placeholder: "Let's write an awesome story",
    });

    setTextEditor(editorInstance);

    return () => {
      editorInstance.destroy();
    };
  }, []);

  const handleBannerUpload = async (e) => {
    let img = e.target.files[0];

    if (!img) return;

    const loadingToast = toast.loading("Uploading...");

    try {
      const url = await uploadImage(img);
      toast.dismiss(loadingToast);
      toast.success("Uploaded 👍");

      setBlog({ ...blog, banner: url });
    } catch (error) {
      toast.dismiss(loadingToast);
      return toast.error(error);
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.keyCode == 13) {
      // Enter key
      e.preventDefault();
    }
  };

  const handleTitleChange = (e) => {
    const input = e.target;
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
    setBlog({ ...blog, title: input.value });
  };

  const handleBannerError = (e) => {
    let img = e.target;
    img.src = defaultBanner;
  };

  const handlePublishEvent = async () => {
    if (!banner.length) {
      return toast.error("Upload a blog banner to publish it");
    }

    if (!title.length) {
      return toast.error("Write blog title to publish it");
    }

    if (!textEditor.isReady) {
      return;
    }

    try {
      const data = await textEditor.save();
      if (data.blocks.length) {
        setBlog({ ...blog, content: data });
        setEditorState("publish");
      } else {
        toast.error("Write something in your blog to publish it");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save the blog content");
    }
  };

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="flex-none w-10">
          <img src={logo} className="w-full" />
        </Link>

        <p className="max-md:hidden text-black line-clamp-1 w-full">
          {title.length ? title : "[Blog Title]"}
        </p>

        <div className="flex gap-4 ml-auto">
          <button className="btn-dark py-2" onClick={handlePublishEvent}>
            Publish
          </button>
          <button className="btn-light py-2">Save Draft</button>
        </div>
      </nav>

      <Toaster />

      <AnimationWrapper
        keyValue="blog-editor"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className=""
      >
        <section>
          <div className="mx-auto max-w-[900px] w-full">
            <div className="relative aspect-video hover:opacity-80 bg-white border-4 border-grey">
              <label htmlFor="uploadBanner">
                <img
                  src={banner}
                  className="z-20"
                  onError={handleBannerError}
                />
                <input
                  id="uploadBanner"
                  type="file"
                  accept=".png, .jpg, .jpeg"
                  hidden
                  onChange={handleBannerUpload}
                />
              </label>
            </div>

            <textarea
              defaultValue={title}
              placeholder="Blog Title"
              className="text-4xl font-medium w-full h-20 outline-none resize-none mt-10 leading-tight placeholder:opacity-40"
              onKeyDown={handleTitleKeyDown}
              onChange={handleTitleChange}
            ></textarea>

            <hr className="w-full opacity-10 my-5" />

            <div id="textEditor" className="font-gelasio"></div>
          </div>
        </section>
      </AnimationWrapper>
    </>
  );
};

export default BlogEditor;
