import * as td from "typedoc";
import {JSX} from "typedoc";
import MarkdownIt from "markdown-it";
import {escapeHtml} from "markdown-it/lib/common/utils.mjs";
import * as shiki from "@gerrit0/mini-shiki";

declare module "typedoc" {
  export interface TypeDocOptionMap {
    languages: string[];
  }
}

export function load(app: td.Application) {
    app.options.addDeclaration({
        name: "languages",
        type: td.ParameterType.Array,
        help: "The source langauges to switch between, written as the string after ```. This list must be in the same order the blocks appear."
    });
    app.renderer.hooks.on("head.end", ctx => {
        let languages = app.options.getValue("languages");
        let style = "", header = '<style data-for="languages">.tsd-code-language-bar {background: var(--color-background-active); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"; margin-left: -10px; margin-top: -10px; padding-left: 10px; padding-top: 5px; padding-bottom: 5px; margin-right: -10px; margin-bottom: 5px; border-top-left-radius: 0.8em; border-top-right-radius: 0.8em;} .tsd-code-language {font-weight: bold;} .tsd-language-toggle .settings-label {margin: 0.25rem 0.75rem 0 0;} :root {';
        /*
         * TODO: Use @container style(--tsd-selected-language: lang) to do this.
         * Unfortunately Firefox doesn't support this at the moment (#1795622),
         * so we have to use separate variables.
         */
        if (languages.length > 1) {
            header += `--tsd-language-${languages[0]}: none; `;
            style = `pre:has(> .${languages[0]}):has(+ pre > .${languages[1]}) {display: var(--tsd-language-${languages[0]});} `;
            for (let i = 1; i < languages.length; i++) {
                header += `--tsd-language-${languages[i]}: none; `;
                style += `pre:has(> .${languages[i-1]}) + pre:has(> .${languages[i]}) {display: var(--tsd-language-${languages[i]});} `;
            }
        }
        const html = header + "} " + style + "</style>";
        return <JSX.Raw html={html}></JSX.Raw>;
    });
    app.renderer.hooks.on("pageSidebar.begin", ctx => {
        const settings = ctx.settings
        ctx.settings = () => {
            let el = settings();
            let options: JSX.Element[] = [];
            const languages = app.options.getValue("languages");
            for (let lang of languages) {
                options.push(<option value={lang}>{shiki.bundledLanguagesInfo.find(info => info.id == lang || info.aliases?.includes(lang))?.name ?? lang}</option>);
            }
            const script = `<script>
                    let tsdSelectedLanguage = localStorage.getItem("tsd-language") ?? "${languages[0]}";
                    let select = document.getElementById("tsd-language");
                    select.value = tsdSelectedLanguage;
                    document.documentElement.style.setProperty("--tsd-language-" + tsdSelectedLanguage, "block");
                    select.onchange = function() {
                        document.documentElement.style.setProperty("--tsd-language-" + tsdSelectedLanguage, "none");
                        tsdSelectedLanguage = select.value;
                        localStorage.setItem("tsd-language", tsdSelectedLanguage);
                        document.documentElement.style.setProperty("--tsd-language-" + tsdSelectedLanguage, "block");
                    }
                </script>`;
            if (options.length > 1)
                ((el.children[0] as JSX.Element).children[1] as JSX.Element).children.push(<div class="tsd-language-toggle">
                    <label class="settings-label" for="tsd-language">Language</label>
                    <select id="tsd-language">
                        {options}
                    </select>
                    <JSX.Raw html={script}></JSX.Raw>
                </div>);
            return el;
        };
        return <div></div>;
    });
    app.renderer.on("beginPage", event => {
        let plugin = app.renderer.markedPlugin;
        (plugin["parser"] as MarkdownIt).set({
            highlight: (code, lang) => {
                code = plugin.getHighlighted(code, lang || "ts");
                code = code.replace(/\n$/, "") + "\n";
                if (!lang) {
                    return `<pre><code>${code}</code><button>${td.i18n.theme_copy()}</button></pre>\n`;
                }
                const name = shiki.bundledLanguagesInfo.find(info => info.id == lang || info.aliases?.includes(lang))?.name ?? lang;
                return `<pre><div class="tsd-code-language-bar"><span class="tsd-code-language">${escapeHtml(name)}</span></div><code class="${escapeHtml(lang)}">${code}</code><button type="button">${td.i18n.theme_copy()}</button></pre>\n`;
            }
        });
    });
}
