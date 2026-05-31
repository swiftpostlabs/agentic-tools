from agentic_tools.core.i18n.main import translate


def test_translate_uses_agentic_tools_translation_directories() -> None:
    assert translate("app.name") == "agentic-tools"
    assert (
        translate("skills.list.placeholder")
        == "skills scaffold: no actions implemented yet"
    )
